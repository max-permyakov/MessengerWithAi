using Messenger;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Messenger.Services;
using System.Text;
using System.Security.Cryptography.X509Certificates;
using System.Security.Cryptography;

var builder = WebApplication.CreateBuilder(args);

const long FiveGb = 5L * 1024 * 1024 * 1024;

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactDev", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://192.168.0.233:5173",
                "https://localhost:5173",
                "https://127.0.0.1:5173",
                "https://192.168.0.233:5173"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .WithHeaders("Content-Type", "Authorization");
    });

    // Политика для доступа из локальной сети
    options.AddPolicy("AllowLocalNetwork", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrEmpty(origin)) return false;
            var uri = new Uri(origin);
            // Разрешить localhost, loopback и private IP диапазоны
            return uri.Host == "localhost" ||
                   uri.Host == "127.0.0.1" ||
                   uri.Host.StartsWith("192.168.") ||
                   uri.Host.StartsWith("10.") ||
                   uri.Host.StartsWith("172.16.") ||
                   uri.Host.StartsWith("172.17.") ||
                   uri.Host.StartsWith("172.18.") ||
                   uri.Host.StartsWith("172.19.") ||
                   uri.Host.StartsWith("172.2") ||
                   uri.Host.StartsWith("172.30.") ||
                   uri.Host.StartsWith("172.31.");
        })
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();
builder.Services.AddSignalR();

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = FiveGb;
    options.ValueLengthLimit = int.MaxValue;
    options.MultipartHeadersLengthLimit = int.MaxValue;
});

builder.WebHost.ConfigureKestrel((context, options) =>
{
    options.Limits.MaxRequestBodySize = FiveGb;
    options.Limits.MinRequestBodyDataRate = null;

    var httpUrl = context.Configuration["Http:Url"] ?? "http://0.0.0.0:4000";
    if (Uri.TryCreate(httpUrl, UriKind.Absolute, out var httpUri))
    {
        options.ListenAnyIP(httpUri.Port);
    }

    var httpsUrl = context.Configuration["Https:Url"] ?? "https://0.0.0.0:4001";
    var certPath = context.Configuration["Https:Certificate:Path"] ?? "certs/prime-dev.pfx";
    var certPassword = context.Configuration["Https:Certificate:Password"];

    if (!string.IsNullOrWhiteSpace(httpsUrl) && Uri.TryCreate(httpsUrl, UriKind.Absolute, out var httpsUri))
    {
        if (!string.IsNullOrWhiteSpace(certPath))
        {
            var fullCertPath = Path.IsPathRooted(certPath)
                ? certPath
                : Path.Combine(context.HostingEnvironment.ContentRootPath, certPath);

            if (File.Exists(fullCertPath))
            {
                X509Certificate2? cert = null;
                try
                {
                    cert = X509CertificateLoader.LoadPkcs12FromFile(
                        fullCertPath,
                        string.IsNullOrWhiteSpace(certPassword) ? null : certPassword,
                        X509KeyStorageFlags.MachineKeySet
                    );
                }
                catch
                {
                    // ignore and try next
                }

                if (cert == null)
                {
                    try
                    {
                        cert = X509CertificateLoader.LoadPkcs12FromFile(
                            fullCertPath,
                            string.Empty,
                            X509KeyStorageFlags.MachineKeySet
                        );
                    }
                    catch
                    {
                        // ignore and try next
                    }
                }

                if (cert == null)
                {
                    try
                    {
                        cert = X509CertificateLoader.LoadPkcs12FromFile(
                            fullCertPath,
                            null,
                            X509KeyStorageFlags.MachineKeySet
                        );
                    }
                    catch
                    {
                        cert = null;
                    }
                }

                if (cert != null)
                {
                    options.ListenAnyIP(httpsUri.Port, listen => listen.UseHttps(cert));
                }
                else
                {
                    Console.WriteLine($"HTTPS cert could not be loaded: {fullCertPath}. HTTPS disabled.");
                }
            }
            else
            {
                Console.WriteLine($"HTTPS cert not found: {fullCertPath}. HTTPS disabled.");
            }
        }
    }
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]
                    ?? throw new InvalidOperationException("Jwt:Key is missing in configuration")))
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/chat"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddHttpsRedirection(options =>
{
    options.HttpsPort = builder.Configuration.GetValue<int?>("HttpsRedirection:HttpsPort") ?? 4001;
});

builder.Services.AddScoped<JwtService>();
builder.Services.AddHttpClient<AiServiceClient>(client =>
{
    var baseUrl = builder.Configuration["AiService:BaseUrl"] ?? "http://localhost:8000";
    client.BaseAddress = new Uri(baseUrl);
    client.Timeout = TimeSpan.FromSeconds(300);
});

var app = builder.Build();

app.UseHttpsRedirection();

// Используем политику для локальной сети
app.UseCors("AllowLocalNetwork");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

app.Run();
