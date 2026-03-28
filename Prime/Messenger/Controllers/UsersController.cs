using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Messenger.DTO;
using System.Security.Claims;

namespace Messenger
{
    [ApiController]
    [Route("api/users")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        public UsersController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }
        
        private string GetWebRoot()
        {
            if (!string.IsNullOrEmpty(_env.WebRootPath))
                return _env.WebRootPath;

            var root = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            Directory.CreateDirectory(root);
            _env.WebRootPath = root;
            return root;
        }

        [HttpGet]
        public async Task<IActionResult> SearchUsers([FromQuery] string? search = null, [FromQuery] int limit = 20)
        {
            var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(currentUserIdClaim, out Guid currentUserId);

            if (string.IsNullOrWhiteSpace(search))
                return Ok(Array.Empty<object>());

            var normalized = search.Trim();
            if (normalized.Length < 2)
                return Ok(Array.Empty<object>());

            var users = await _context.Users
                .Where(u => u.Id != currentUserId)
                .Where(u => EF.Functions.Like(u.Username, $"%{normalized}%"))
                .OrderBy(u => u.Username)
                .Take(Math.Clamp(limit, 1, 50))
                .Select(u => new { id = u.Id, username = u.Username })
                .ToListAsync();

            return Ok(users);
        }

        private static string? GetAvatarUrl(User u)
        {
            if (string.IsNullOrWhiteSpace(u.AvatarPath)) return null;
            return $"/api/users/{u.Id}/avatar";
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                return Unauthorized("Invalid user token");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId);
            if (user == null) return Unauthorized("User not found");

            return Ok(new UserProfileDto
            {
                Id = user.Id.ToString(),
                Username = user.Username,
                DisplayName = user.DisplayName,
                Bio = user.Bio,
                AvatarUrl = GetAvatarUrl(user),
                CreatedAt = user.CreatedAt.ToString("O")
            });
        }

        [HttpPut("me")]
        public async Task<IActionResult> UpdateMe([FromBody] UpdateMyProfileDto dto)
        {
            var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                return Unauthorized("Invalid user token");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId);
            if (user == null) return Unauthorized("User not found");

            user.DisplayName = string.IsNullOrWhiteSpace(dto.DisplayName) ? null : dto.DisplayName.Trim();
            user.Bio = string.IsNullOrWhiteSpace(dto.Bio) ? null : dto.Bio.Trim();

            await _context.SaveChangesAsync();

            return Ok(new UserProfileDto
            {
                Id = user.Id.ToString(),
                Username = user.Username,
                DisplayName = user.DisplayName,
                Bio = user.Bio,
                AvatarUrl = GetAvatarUrl(user),
                CreatedAt = user.CreatedAt.ToString("O")
            });
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetUserById(Guid id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null) return NotFound("User not found");

            return Ok(new UserProfileDto
            {
                Id = user.Id.ToString(),
                Username = user.Username,
                DisplayName = user.DisplayName,
                Bio = user.Bio,
                AvatarUrl = GetAvatarUrl(user),
                CreatedAt = user.CreatedAt.ToString("O")
            });
        }

        [HttpPost("me/avatar")]
        [RequestSizeLimit(20L * 1024 * 1024)]
        public async Task<IActionResult> UploadMyAvatar([FromForm] IFormFile file)
        {
            var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                return Unauthorized("Invalid user token");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId);
            if (user == null) return Unauthorized("User not found");

            if (file == null || file.Length == 0) return BadRequest("File is required");
            if (string.IsNullOrWhiteSpace(file.ContentType) || !file.ContentType.StartsWith("image/"))
                return BadRequest("Only image files are allowed");

            var ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(ext)) ext = ".jpg";

            var uploadsDir = Path.Combine(GetWebRoot(), "uploads", "avatars");
            Directory.CreateDirectory(uploadsDir);

            var fileName = $"{currentUserId:N}{ext.ToLowerInvariant()}";
            var fullPath = Path.Combine(uploadsDir, fileName);

            await using (var stream = System.IO.File.Create(fullPath))
            {
                await file.CopyToAsync(stream);
            }

            user.AvatarPath = Path.Combine("uploads", "avatars", fileName).Replace('\\', '/');
            await _context.SaveChangesAsync();

            return Ok(new UserProfileDto
            {
                Id = user.Id.ToString(),
                Username = user.Username,
                DisplayName = user.DisplayName,
                Bio = user.Bio,
                AvatarUrl = GetAvatarUrl(user),
                CreatedAt = user.CreatedAt.ToString("O")
            });
        }

        [HttpGet("{id:guid}/avatar")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAvatar(Guid id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null) return NotFound("User not found");
            if (string.IsNullOrWhiteSpace(user.AvatarPath)) return NotFound("Avatar not set");

            var fullPath = Path.Combine(GetWebRoot(), user.AvatarPath.Replace('/', Path.DirectorySeparatorChar));
            if (!System.IO.File.Exists(fullPath)) return NotFound("Avatar not found");

            var contentType = "application/octet-stream";
            var ext = Path.GetExtension(fullPath).ToLowerInvariant();
            if (ext == ".png") contentType = "image/png";
            else if (ext == ".jpg") contentType = "image/jpg";
            else if (ext == ".jpeg") contentType = "image/jpeg";
            else if (ext == ".webp") contentType = "image/webp";
            else if (ext == ".gif") contentType = "image/gif";

            return PhysicalFile(fullPath, contentType);
        }

        [HttpDelete("me")]
        public async Task<IActionResult> DeleteMe()
        {
            var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                return Unauthorized("Invalid user token");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId);
            if (user == null) return Ok(new { message = "Account already deleted" });

            await using var tx = await _context.Database.BeginTransactionAsync();

            // Remove messages sent by user (Sender FK is Restrict)
            var myMessages = await _context.Messages.Where(m => m.SenderId == currentUserId).ToListAsync();
            _context.Messages.RemoveRange(myMessages);
            await _context.SaveChangesAsync();

            // Remove membership rows
            var myChatUsers = await _context.ChatUsers.Where(cu => cu.UserId == currentUserId).ToListAsync();
            _context.ChatUsers.RemoveRange(myChatUsers);
            await _context.SaveChangesAsync();

            // Remove chats that have no participants left
            var emptyChats = await _context.Chats
                .Include(c => c.ChatUsers)
                .Where(c => !c.ChatUsers.Any())
                .ToListAsync();
            _context.Chats.RemoveRange(emptyChats);
            await _context.SaveChangesAsync();

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            await tx.CommitAsync();

            return Ok(new { message = "Account deleted" });
        }
    }
}
