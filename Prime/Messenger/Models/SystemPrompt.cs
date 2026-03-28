namespace Messenger.Models
{
    public class SystemPrompt
    {
        public int Id { get; set; }
        public Guid? UserId { get; set; }
        public string Prompt { get; set; } = string.Empty;
        public bool IsGlobal { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
