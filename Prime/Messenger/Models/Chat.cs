namespace Messenger.Models
{
    public class Chat
    {
        public Guid Id { get; set; }                // PK
        public string? Name { get; set; }           // null для личных чатов
        public bool IsGroup { get; set; }           // true = группа, false = диалог 1:1
        public bool IsAi { get; set; }
        public Guid? AiOwnerUserId { get; set; }
        public DateTime CreatedAt { get; set; }

        public ICollection<ChatUser> ChatUsers { get; set; } = new List<ChatUser>();
        public ICollection<Message> Messages { get; set; } = new List<Message>();
    }
}
