using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Messenger
{
    [ApiController]
    [Route("api/files")]
    [Authorize]
    public class FilesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        public FilesController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        [HttpGet("{messageId}")]
        public async Task<IActionResult> Download(Guid messageId)
        {
            var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                return Unauthorized("Invalid user token");

            var message = await _context.Messages
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.Id == messageId);

            if (message == null)
                return NotFound("Message not found");

            var hasAccess = await _context.ChatUsers
                .AnyAsync(cu => cu.ChatId == message.ChatId && cu.UserId == currentUserId);

            if (!hasAccess)
                return Forbid("You don't have access to this file");

            if (string.IsNullOrWhiteSpace(message.FilePath) || string.IsNullOrWhiteSpace(message.FileName))
                return NotFound("File not found");

            var filePath = Path.Combine(_env.WebRootPath ?? "wwwroot", message.FilePath.Replace("/", Path.DirectorySeparatorChar.ToString()));
            if (!System.IO.File.Exists(filePath))
                return NotFound("File missing on server");

            var contentType = message.FileContentType ?? "application/octet-stream";
            return PhysicalFile(filePath, contentType, message.FileName);
        }
    }
}
