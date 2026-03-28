using Messenger.Models;

namespace Messenger{
    public class User
    {
        public Guid Id { get; set; }                // PK
        public string Username { get; set; } = null!;
        public string PasswordHash { get; set; } = null!;
        public string? DisplayName { get; set; }
        public string? Bio { get; set; }
        public string? AvatarPath { get; set; } // relative to wwwroot, e.g. "uploads/avatars/<guid>.jpg"
        public DateTime CreatedAt { get; set; }

        public ICollection<ChatUser> ChatUsers { get; set; } = new List<ChatUser>();
        public ICollection<Message> SentMessages { get; set; } = new List<Message>();
    }
}
