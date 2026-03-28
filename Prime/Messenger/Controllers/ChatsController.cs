using Messenger.DTO;
using Messenger.Models;
using Messenger.Services;
using Microsoft.AspNetCore.Authorization; 
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Security.Claims;

namespace Messenger
{
    [ApiController]
    [Route("api/chats")]
    [Authorize] 
    public class ChatController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<ChatHub> _hubContext;
        private readonly IWebHostEnvironment _env;
        private readonly AiServiceClient _aiServiceClient;
        private readonly IConfiguration _configuration;

        public ChatController(AppDbContext context, IHubContext<ChatHub> hubContext, IWebHostEnvironment env, AiServiceClient aiServiceClient, IConfiguration configuration)
        {
            _context = context;
            _hubContext = hubContext;
            _env = env;
            _aiServiceClient = aiServiceClient;
            _configuration = configuration;
        }

        private static readonly TimeZoneInfo MoscowTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Russian Standard Time");

        private static DateTime ToMoscow(DateTime utc)
        {
            var normalized = utc.Kind == DateTimeKind.Utc ? utc : DateTime.SpecifyKind(utc, DateTimeKind.Utc);
            return TimeZoneInfo.ConvertTimeFromUtc(normalized, MoscowTimeZone);
        }

        private static bool IsTextFile(string contentType, string fileName)
        {
            if (!string.IsNullOrWhiteSpace(contentType) && contentType.StartsWith("text/"))
                return true;

            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            return ext is ".txt" or ".md" or ".csv" or ".json" or ".log" or ".xml" or ".yml" or ".yaml" or ".ini";
        }

        /// <summary>
        /// Отправляет уведомления всем участникам чата об новом сообщении и обновляет их счётчики непрочитанных
        /// </summary>
        private async Task NotifyChatMembersAsync(Chat chat, Message message, Guid senderId)
        {
            var chatIdStr = chat.Id.ToString();
            var notification = new NewMessageNotification
            {
                MessageId = message.Id.ToString(),
                ChatId = chatIdStr,
                Author = message.IsAi && message.Role == "assistant" ? "Prime AI" : (message.Sender?.Username ?? "Unknown"),
                Text = message.Text,
                CreatedAt = message.CreatedAt,
                IsAi = message.IsAi
            };

            // Отправляем уведомление через SignalR
            await _hubContext.Clients.Group(chatIdStr).SendAsync("ReceiveNewMessageNotification", chatIdStr, notification);

            // Обновляем счётчики непрочитанных для всех участников, кроме отправителя
            var otherMembers = chat.ChatUsers.Where(cu => cu.UserId != senderId).ToList();
            foreach (var member in otherMembers)
            {
                // Подсчитываем непрочитанные сообщения для этого участника
                var unreadCount = chat.Messages.Count(m => m.CreatedAt > (member.LastReadAt ?? DateTime.MinValue));
                await _hubContext.Clients.User(member.UserId.ToString()).SendAsync("UnreadCountUpdated", chatIdStr, unreadCount);
            }
        }

        private MessageDto ToDto(Message message, Guid currentUserId, Chat chat)
        {
            var isMine = message.SenderId == currentUserId;
            var others = chat.ChatUsers.Where(cu => cu.UserId != currentUserId).ToList();
            var read = !isMine
                ? true
                : others.Count == 0
                    ? true
                    : others.All(cu => cu.LastReadAt.HasValue && cu.LastReadAt.Value >= message.CreatedAt);

            return new MessageDto
            {
                Id = message.Id,
                Author = message.IsAi && message.Role == "assistant"
                    ? "Prime AI"
                    : message.Sender?.Username ?? "Unknown",
                Text = message.Text,
                Role = message.Role,
                IsAi = message.IsAi,
                ModelName = message.ModelName,
                PromptId = message.PromptId,
                Time = ToMoscow(message.CreatedAt).ToString("HH:mm"),
                IsMine = message.SenderId == currentUserId,
                CreatedAt = message.CreatedAt.ToString("O"),
                FileName = message.FileName,
                FileSize = message.FileSize,
                FileUrl = message.FilePath == null ? null : $"/api/files/{message.Id}",
                FileContentType = message.FileContentType,
                HasFile = !string.IsNullOrEmpty(message.FilePath),
                Delivered = true,
                Read = read
            };
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetChatDetails(Guid id)
        {
            var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                return Unauthorized("Invalid user token");

            var chat = await _context.Chats
                .Include(c => c.ChatUsers)
                .ThenInclude(cu => cu.User)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (chat == null) return NotFound("Chat not found");

            var hasAccess = chat.ChatUsers.Any(cu => cu.UserId == currentUserId);
            if (!hasAccess) return Forbid("You don't have access to this chat");

            string? avatarUrl(User u) => string.IsNullOrWhiteSpace(u.AvatarPath) ? null : $"/api/users/{u.Id}/avatar";

            var dto = new ChatDetailsDto
            {
                Id = chat.Id.ToString(),
                Type = chat.IsAi ? "ai" : (chat.IsGroup ? "group" : "direct"),
                Name = chat.IsGroup ? chat.Name : null,
                CreatedAt = chat.CreatedAt.ToString("O"),
                Participants = chat.ChatUsers
                    .Where(cu => cu.User != null)
                    .Select(cu => new ChatParticipantDto
                    {
                        Id = cu.User!.Id.ToString(),
                        Username = cu.User!.Username,
                        DisplayName = cu.User!.DisplayName,
                        AvatarUrl = avatarUrl(cu.User!)
                    })
                    .OrderBy(p => p.Username)
                    .ToList()
            };

            return Ok(dto);
        }

        [HttpGet("{id}/messages")] 
        public async Task<IActionResult> GetMessages(Guid id, [FromQuery] int skip = 0, [FromQuery] int take = 50)
        {
           
            var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value; 
            if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                return Unauthorized("Invalid user token");  

         
            var chatExists = await _context.Chats.AnyAsync(c => c.Id == id);
            if (!chatExists)
                return NotFound("Chat not found"); 

            var hasAccess = await _context.ChatUsers
                .AnyAsync(cu => cu.ChatId == id && cu.UserId == currentUserId);
            if (!hasAccess)
                return Forbid("You don't have access to this chat");  

            
            var chatWithUsers = await _context.Chats
                .Include(c => c.ChatUsers)
                .FirstOrDefaultAsync(c => c.Id == id);
            if (chatWithUsers == null)
                return NotFound("Chat not found");

            var messages = await _context.Messages
                .Include(m => m.Sender)
                .Where(m => m.ChatId == id)
                .OrderBy(m => m.CreatedAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync();

            var result = messages.Select(m => ToDto(m, currentUserId, chatWithUsers)).ToList();

            var chatUser = await _context.ChatUsers
                .FirstOrDefaultAsync(cu => cu.ChatId == id && cu.UserId == currentUserId);
            if (chatUser != null)
            {
                chatUser.LastReadAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return Ok(result);  
        }
        [HttpGet]                         
        public async Task<IActionResult> GetMyChats()
        {
            
            var username = User.FindFirst(ClaimTypes.Name)?.Value;
            if (string.IsNullOrEmpty(username))
                return Unauthorized("No username in token");

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == username);

            if (user == null)
                return Unauthorized("User not found");

            if (_configuration.GetValue<bool>("Features:AiEnabled"))
            {
                await EnsureAiChatForUser(user.Id);
            }

            string? AvatarUrlFor(User u) =>
                string.IsNullOrWhiteSpace(u.AvatarPath) ? null : $"/api/users/{u.Id}/avatar";

            var chats = await _context.Chats
                .Include(c => c.ChatUsers)
                .ThenInclude(cu => cu.User)
                .Where(c => c.ChatUsers.Any(cu => cu.UserId == user.Id))
                .Select(c => new
                {
                    Chat = c,
                    OtherUser = !c.IsGroup
                        ? c.ChatUsers.Where(cu => cu.UserId != user.Id).Select(cu => cu.User).FirstOrDefault()
                        : null
                })
                .ToListAsync();

            var result = chats.Select(x =>
            {
                var c = x.Chat;
                var other = x.OtherUser;
                var isGroup = c.IsGroup;

                var cuForUser = c.ChatUsers.FirstOrDefault(cu => cu.UserId == user.Id);

                var title = c.IsAi
                    ? "Prime AI"
                    : isGroup
                    ? (c.Name ?? "Группа без названия")
                    : (other?.Username ?? "Личный чат");

                var subtitle = c.IsAi
                    ? "Личный чат с нейросетью"
                    : isGroup
                    ? $"{c.ChatUsers.Count} участников"
                    : "Личный чат";

                var lastMessage = c.Messages
                    .OrderByDescending(m => m.CreatedAt)
                    .FirstOrDefault();

                var lastMessageText = lastMessage?.Text ?? "";

                var lastActivity = lastMessage?.CreatedAt ?? c.CreatedAt;
                var updatedAt = ToMoscow(lastActivity)
                        .ToString("dd.MM.yyyy HH:mm");

                var unread = 0;
                if (cuForUser?.LastReadAt != null)
                {
                    unread = c.Messages.Count(m => m.CreatedAt > cuForUser.LastReadAt);
                }

                return new
                {
                    Dto = new ChatResponseDto
                    {
                        Id = c.Id.ToString(),
                        Type = c.IsAi ? "ai" : (isGroup ? "group" : "direct"),
                        Title = title,
                        Subtitle = subtitle,
                        LastMessage = lastMessageText,
                        UpdatedAt = updatedAt,
                        UnreadCount = unread,
                        AvatarUrl = isGroup ? null : (other != null ? AvatarUrlFor(other) : null)
                    },
                    LastActivity = lastActivity
                };
            })
            .OrderByDescending(x => x.LastActivity)
            .Select(x => x.Dto)
            .ToList();

            return Ok(result);  
        }
        [HttpPost]
        public async Task<IActionResult> CreateChat([FromBody] CreateChatDto dto)
        {
            var currentUsername = User.FindFirst(ClaimTypes.Name)?.Value;
            if (string.IsNullOrEmpty(currentUsername))
                return Unauthorized("Invalid token");

            var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == currentUsername);
            if (currentUser == null)
                return Unauthorized("User not found");

            // Валидация
            if (dto.Usernames == null) dto.Usernames = new List<string>();

            if (!dto.Usernames.Any() && !dto.IsGroup)
                return BadRequest("Для личного чата укажите хотя бы одного собеседника");

            if (dto.IsGroup && string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest("У группы должно быть название");

            if (!dto.IsGroup && dto.Usernames.Count > 1)
                return BadRequest("Для личного чата можно выбрать только одного собеседника");

            var uniqueUsernames = dto.Usernames
                .Where(u => !string.IsNullOrWhiteSpace(u))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            // Запрещаем создание чата с самим собой
            if (uniqueUsernames.Any(u => string.Equals(u, currentUsername, StringComparison.OrdinalIgnoreCase)))
                return BadRequest("Нельзя создать личный чат с самим собой");

            var users = await _context.Users
                .Where(u => uniqueUsernames.Contains(u.Username))
                .ToListAsync();

            if (users.Count != uniqueUsernames.Count)
            {
                var missing = uniqueUsernames.Except(users.Select(u => u.Username));
                return BadRequest($"Пользователи не найдены: {string.Join(", ", missing)}");
            }

            // Проверка существующего direct-чата
            if (!dto.IsGroup && uniqueUsernames.Count == 1)
            {
                var targetUsername = uniqueUsernames[0];
                var existing = await _context.Chats
                    .Include(c => c.ChatUsers).ThenInclude(cu => cu.User)
                    .Where(c => !c.IsGroup)
                    .Where(c => c.ChatUsers.Any(cu => cu.UserId == currentUser.Id))
                    .Where(c => c.ChatUsers.Any(cu => cu.User!.Username == targetUsername))
                    .FirstOrDefaultAsync();

                if (existing != null)
                    return Conflict(new { message = "Личный чат уже существует", chatId = existing.Id.ToString() });
            }

            // Создание чата
            var chat = new Chat
            {
                IsGroup = dto.IsGroup,
                Name = dto.IsGroup ? dto.Name : null,
                CreatedAt = DateTime.UtcNow
            };

            var allParticipants = users;
            if (!allParticipants.Any(u => u.Id == currentUser.Id))
                allParticipants.Add(currentUser);

            chat.ChatUsers = allParticipants.Select(u => new ChatUser { UserId = u.Id }).ToList();

            _context.Chats.Add(chat);
            await _context.SaveChangesAsync();

            // Ответ
            var title = dto.IsGroup
                ? (dto.Name ?? "Группа без названия")
                : (users.FirstOrDefault()?.Username ?? "Новый чат");

            var subtitle = dto.IsGroup
                ? $"{allParticipants.Count} участников"
                : "Личный чат";

            return Ok(new ChatResponseDto
            {
                Id = chat.Id.ToString(),
                Type = dto.IsGroup ? "group" : "direct",
                Title = title,
                Subtitle = subtitle,
                LastMessage = "",
                UpdatedAt = ToMoscow(chat.CreatedAt).ToString("HH:mm"),
                UnreadCount = 0
            });
        }

        [HttpPost("{id}/messages")]
        public async Task<IActionResult> SendMessage(Guid id, [FromBody] SendMessageDto dto)
        {
            var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                return Unauthorized("Invalid user token");

            if (dto == null || string.IsNullOrWhiteSpace(dto.Text))
                return BadRequest("Текст сообщения не может быть пустым");

            var chat = await _context.Chats
                .Include(c => c.ChatUsers)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (chat == null)
                return NotFound("Chat not found");

            var hasAccess = chat.ChatUsers.Any(cu => cu.UserId == currentUserId);
            if (!hasAccess)
                return Forbid("You don't have access to this chat");

            if (chat.IsAi)
            {
                if (!_configuration.GetValue<bool>("Features:AiEnabled"))
                    return BadRequest(new { message = "AI feature is disabled" });

                var userMessage = new Message
                {
                    Id = Guid.NewGuid(),
                    ChatId = id,
                    SenderId = currentUserId,
                    Text = dto.Text.Trim(),
                    Role = "user",
                    IsAi = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Messages.Add(userMessage);
                await _context.SaveChangesAsync();

                var currentSender = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId);
                userMessage.Sender = currentSender ?? userMessage.Sender;
                var userResponse = ToDto(userMessage, currentUserId, chat);
                await _hubContext.Clients.Group(id.ToString()).SendAsync("ReceiveMessage", userResponse);

                AiChatResponseDto aiResult;
                try
                {
                    aiResult = await _aiServiceClient.ChatAsync(currentUserId, id, new AiChatRequestDto
                    {
                        Prompt = dto.Text.Trim(),
                        Stream = true,
                        Model = string.IsNullOrWhiteSpace(dto.Model) ? null : dto.Model,
                        PromptId = dto.PromptId
                    });
                }
                catch (Exception ex)
                {
                    return BadRequest(new { message = ex.Message });
                }

                var assistantMessage = new Message
                {
                    Id = Guid.NewGuid(),
                    ChatId = id,
                    SenderId = currentUserId,
                    Text = aiResult.Content,
                    Role = "assistant",
                    IsAi = true,
                    ModelName = aiResult.Model,
                    PromptId = aiResult.PromptId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Messages.Add(assistantMessage);
                await _context.SaveChangesAsync();

                var assistantResponse = ToDto(assistantMessage, currentUserId, chat);
                await _hubContext.Clients.Group(id.ToString()).SendAsync("ReceiveMessage", assistantResponse);
                
                // Для AI-чатов не отправляем уведомления пользователю (он же отправитель)
                
                return Ok(assistantResponse);
            }

            var message = new Message
            {
                Id = Guid.NewGuid(),
                ChatId = id,
                SenderId = currentUserId,
                Text = dto.Text.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId);
            message.Sender = sender ?? message.Sender;
            var response = ToDto(message, currentUserId, chat);

            // Отправляем сообщение через SignalR
            await _hubContext.Clients.Group(id.ToString()).SendAsync("ReceiveMessage", response);
            
            // Отправляем уведомления участникам
            await NotifyChatMembersAsync(chat, message, currentUserId);

            return Ok(response);
        }

        [HttpPost("{id}/messages/file")]
        [RequestSizeLimit(5L * 1024 * 1024 * 1024)]
        [RequestFormLimits(MultipartBodyLengthLimit = 5L * 1024 * 1024 * 1024)]
        public async Task<IActionResult> SendFileMessage(Guid id, [FromForm] SendFileMessageDto dto, CancellationToken cancellationToken)
        {
            var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                return Unauthorized("Invalid user token");

            var chat = await _context.Chats
                .Include(c => c.ChatUsers)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (chat == null)
                return NotFound("Chat not found");

            var hasAccess = chat.ChatUsers.Any(cu => cu.UserId == currentUserId);
            if (!hasAccess)
                return Forbid("You don't have access to this chat");

            if (dto == null || dto.File == null || dto.File.Length == 0)
                return BadRequest("Файл не выбран");

            var uploadsRoot = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads");
            Directory.CreateDirectory(uploadsRoot);

            var originalName = Path.GetFileName(dto.File.FileName);
            var ext = Path.GetExtension(originalName);
            var storedName = $"{Guid.NewGuid():N}{ext}";
            var storedPath = Path.Combine(uploadsRoot, storedName);

            await using (var stream = System.IO.File.Create(storedPath))
            {
                await dto.File.CopyToAsync(stream);
            }

            var message = new Message
            {
                Id = Guid.NewGuid(),
                ChatId = id,
                SenderId = currentUserId,
                Text = dto.Text?.Trim() ?? string.Empty,
                FileName = originalName,
                FileSize = dto.File.Length,
                FileContentType = dto.File.ContentType,
                FilePath = Path.Combine("uploads", storedName).Replace("\\", "/"),
                CreatedAt = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId);
            message.Sender = sender ?? message.Sender;
            var response = ToDto(message, currentUserId, chat);

            await _hubContext.Clients.Group(id.ToString()).SendAsync("ReceiveMessage", response);
            
            // Отправляем уведомления участникам
            await NotifyChatMembersAsync(chat, message, currentUserId);

            if (chat.IsAi)
            {
                if (!_configuration.GetValue<bool>("Features:AiEnabled"))
                    return BadRequest(new { message = "AI feature is disabled" });

                const long MaxAiFileBytes = 2L * 1024 * 1024;
                const int MaxAiTextChars = 8000;

                var prompt = dto.Text?.Trim() ?? string.Empty;
                var images = new List<string>();

                var fullPath = Path.Combine(uploadsRoot, storedName);
                if (dto.File.ContentType.StartsWith("image/") && dto.File.Length <= MaxAiFileBytes)
                {
                    try
                    {
                        var bytes = await System.IO.File.ReadAllBytesAsync(fullPath, cancellationToken);
                        images.Add(Convert.ToBase64String(bytes));
                        if (string.IsNullOrWhiteSpace(prompt))
                            prompt = $"Пользователь отправил изображение {originalName}.";
                    }
                    catch
                    {
                        // ignore image read errors, will fallback to metadata
                    }
                }

                if (images.Count == 0)
                {
                    if (IsTextFile(dto.File.ContentType, originalName) && dto.File.Length <= MaxAiFileBytes)
                    {
                        try
                        {
                            using var reader = new StreamReader(fullPath, Encoding.UTF8, true);
                            var content = await reader.ReadToEndAsync();
                            if (content.Length > MaxAiTextChars)
                                content = content.Substring(0, MaxAiTextChars);
                            var header = $"Файл {originalName}:\n";
                            prompt = string.IsNullOrWhiteSpace(prompt)
                                ? header + content
                                : $"{prompt}\n\n{header}{content}";
                        }
                        catch
                        {
                            // ignore text read errors
                        }
                    }
                    else
                    {
                        var meta = $"Пользователь отправил файл {originalName} ({dto.File.ContentType}, {dto.File.Length} байт).";
                        prompt = string.IsNullOrWhiteSpace(prompt) ? meta : $"{prompt}\n\n{meta}";
                    }
                }

                AiChatResponseDto aiResult;
                try
                {
                    aiResult = await _aiServiceClient.ChatAsync(currentUserId, id, new AiChatRequestDto
                    {
                        Prompt = string.IsNullOrWhiteSpace(prompt) ? $"Пользователь отправил файл {originalName}." : prompt,
                        Stream = true,
                        Model = string.IsNullOrWhiteSpace(dto.Model) ? null : dto.Model,
                        PromptId = dto.PromptId,
                        Images = images
                    });
                }
                catch (Exception ex)
                {
                    return BadRequest(new { message = ex.Message });
                }

                var assistantMessage = new Message
                {
                    Id = Guid.NewGuid(),
                    ChatId = id,
                    SenderId = currentUserId,
                    Text = aiResult.Content,
                    Role = "assistant",
                    IsAi = true,
                    ModelName = aiResult.Model,
                    PromptId = aiResult.PromptId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Messages.Add(assistantMessage);
                await _context.SaveChangesAsync();

                var assistantResponse = ToDto(assistantMessage, currentUserId, chat);
                await _hubContext.Clients.Group(id.ToString()).SendAsync("ReceiveMessage", assistantResponse);
                // Для AI-чатов не отправляем уведомления пользователю (он же отправитель)
            }

            return Ok(response);
        }

        [HttpPost("{id}/messages/forward")]
        public async Task<IActionResult> ForwardMessage(Guid id, [FromBody] ForwardMessageDto dto)
        {
            var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                return Unauthorized("Invalid user token");

            if (dto == null || dto.MessageId == Guid.Empty)
                return BadRequest("MessageId обязателен");

            var targetChat = await _context.Chats
                .Include(c => c.ChatUsers)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (targetChat == null)
                return NotFound("Chat not found");

            if (!targetChat.ChatUsers.Any(cu => cu.UserId == currentUserId))
                return Forbid("You don't have access to this chat");

            var sourceMessage = await _context.Messages
                .Include(m => m.Chat)
                .FirstOrDefaultAsync(m => m.Id == dto.MessageId);

            if (sourceMessage == null)
                return NotFound("Message not found");

            var hasSourceAccess = await _context.ChatUsers
                .AnyAsync(cu => cu.ChatId == sourceMessage.ChatId && cu.UserId == currentUserId);

            if (!hasSourceAccess)
                return Forbid("You don't have access to source message");

            var forwarded = new Message
            {
                Id = Guid.NewGuid(),
                ChatId = id,
                SenderId = currentUserId,
                Text = dto.Text?.Trim() ?? sourceMessage.Text,
                FileName = sourceMessage.FileName,
                FileSize = sourceMessage.FileSize,
                FileContentType = sourceMessage.FileContentType,
                FilePath = sourceMessage.FilePath,
                CreatedAt = DateTime.UtcNow
            };

            _context.Messages.Add(forwarded);
            await _context.SaveChangesAsync();

            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId);
            forwarded.Sender = sender ?? forwarded.Sender;
            var response = ToDto(forwarded, currentUserId, targetChat);

            await _hubContext.Clients.Group(id.ToString()).SendAsync("ReceiveMessage", response);
            
            // Отправляем уведомления участникам
            await NotifyChatMembersAsync(targetChat, forwarded, currentUserId);

            return Ok(response);
        }

        [HttpDelete("{chatId}/messages/{messageId}")]
        public async Task<IActionResult> DeleteMessage(Guid chatId, Guid messageId)
        {
            var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                return Unauthorized("Invalid user token");

            var message = await _context.Messages
                .Include(m => m.Chat)
                .Include(m => m.Sender)
                .FirstOrDefaultAsync(m => m.Id == messageId && m.ChatId == chatId);

            if (message == null)
                return NotFound("Message not found");

            var isParticipant = await _context.ChatUsers
                .AnyAsync(cu => cu.ChatId == chatId && cu.UserId == currentUserId);
            if (!isParticipant)
                return Forbid("You don't have access to this chat");

            if (message.SenderId != currentUserId)
                return Forbid("You can delete only your own messages");

            if (!string.IsNullOrWhiteSpace(message.FilePath))
            {
                var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                var fullPath = Path.Combine(webRoot, message.FilePath.Replace('/', Path.DirectorySeparatorChar));
                if (System.IO.File.Exists(fullPath))
                {
                    try { System.IO.File.Delete(fullPath); } catch { /* ignore */ }
                }
            }

            _context.Messages.Remove(message);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private async Task EnsureAiChatForUser(Guid userId)
        {
            var exists = await _context.Chats
                .AnyAsync(c => c.IsAi && c.AiOwnerUserId == userId);
            if (exists)
                return;

            var chat = new Chat
            {
                Id = Guid.NewGuid(),
                IsGroup = false,
                IsAi = true,
                AiOwnerUserId = userId,
                Name = "Prime AI",
                CreatedAt = DateTime.UtcNow,
                ChatUsers = new List<ChatUser>
                {
                    new() { UserId = userId }
                }
            };
            _context.Chats.Add(chat);
            await _context.SaveChangesAsync();
        }
    }
}
