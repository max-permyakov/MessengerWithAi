namespace Messenger.DTO
{
    public class SendMessageDto
    {
        public string Text { get; set; } = string.Empty;
        public string? Model { get; set; }
        public int? PromptId { get; set; }
    }
}
