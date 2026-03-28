namespace Messenger
{
    public class MessageDto
    {
        public Guid Id { get; set; }
        public string Author { get; set; } = string.Empty;  
        public string Text { get; set; } = string.Empty;
        public string Role { get; set; } = "user";
        public bool IsAi { get; set; }
        public string? ModelName { get; set; }
        public int? PromptId { get; set; }
        public string Time { get; set; } = string.Empty; 
        public bool IsMine { get; set; }  
        public string CreatedAt { get; set; } = string.Empty; 
        public string? FileName { get; set; }
        public long? FileSize { get; set; }
        public string? FileUrl { get; set; }
        public string? FileContentType { get; set; }
        public bool HasFile { get; set; }
        public bool Delivered { get; set; }
        public bool Read { get; set; }
    }
}
