namespace Messenger.Models
{
    public class ChatUser                         // промежуточная таблица (join entity)
    {
        public Guid ChatId { get; set; }            // FK → Chat
        public Guid UserId { get; set; }            // FK → User

        public DateTime? LastReadAt { get; set; }

        public Chat Chat { get; set; } = null!;
        public User User { get; set; } = null!;

        // можно добавить поля: JoinedAt, Role (admin/member), IsMuted и т.д.
    }
}
