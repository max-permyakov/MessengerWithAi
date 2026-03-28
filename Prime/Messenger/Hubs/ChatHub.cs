using Microsoft.AspNetCore.SignalR;

namespace Messenger;

public class ChatHub : Hub
{
    public async Task SendMessage(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", user, message);
    }

    public async Task JoinChat(string chatId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, chatId);
        await Clients.Group(chatId).SendAsync("UserJoined", Context.User?.Identity?.Name ?? "Аноним");
    }

    /// <summary>
    /// Отправляет уведомление о новом сообщении всем участникам чата, кроме отправителя
    /// </summary>
    public async Task NotifyNewMessage(string chatId, NewMessageNotification notification)
    {
        await Clients.Group(chatId).SendAsync("ReceiveNewMessageNotification", chatId, notification);
    }

    /// <summary>
    /// Обновляет счётчик непрочитанных сообщений для конкретного чата
    /// </summary>
    public async Task UpdateUnreadCount(string chatId, int unreadCount)
    {
        await Clients.Group(chatId).SendAsync("UnreadCountUpdated", chatId, unreadCount);
    }

    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}

/// <summary>
/// DTO для уведомления о новом сообщении
/// </summary>
public class NewMessageNotification
{
    public string MessageId { get; set; } = null!;
    public string ChatId { get; set; } = null!;
    public string Author { get; set; } = null!;
    public string Text { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public bool IsAi { get; set; }
}