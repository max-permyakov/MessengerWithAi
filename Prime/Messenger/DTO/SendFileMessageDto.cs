using Microsoft.AspNetCore.Http;

namespace Messenger.DTO
{
    public class SendFileMessageDto
    {
        public string? Text { get; set; }
        public IFormFile? File { get; set; }
        public string? Model { get; set; }
        public int? PromptId { get; set; }
    }
}
