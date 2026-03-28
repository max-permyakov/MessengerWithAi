namespace Messenger.DTO
{
    public class CreateChatDto
    {
        public string? Name { get; set; }           // обязательно для группы
        public bool IsGroup { get; set; }           // true = группа, false = личный чат
        public List<string> Usernames { get; set; } = new();  // usernames участников (включая создателя?)
    }
}
