namespace Messenger
{

    public class ChatResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;   // "direct" | "group" | "ai"
        public string Title { get; set; } = string.Empty;
        public string Subtitle { get; set; } = string.Empty;
        public string LastMessage { get; set; } = string.Empty;
        public string UpdatedAt { get; set; } = string.Empty;
        public int UnreadCount { get; set; } = 0;
        public string? AvatarUrl { get; set; }
    }
}