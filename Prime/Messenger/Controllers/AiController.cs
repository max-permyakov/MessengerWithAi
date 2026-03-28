using System.Security.Claims;
using Messenger.DTO;
using Messenger.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Messenger.Controllers;

[ApiController]
[Route("api/ai")]
[Authorize]
public class AiController(AiServiceClient aiServiceClient, IConfiguration configuration, AppDbContext context) : ControllerBase
{
    private bool IsEnabled() => configuration.GetValue<bool>("Features:AiEnabled");

    [HttpGet("models")]
    public async Task<IActionResult> GetModels(CancellationToken cancellationToken)
    {
        if (!IsEnabled()) return BadRequest(new { message = "AI feature is disabled" });
        try
        {
            var models = await aiServiceClient.GetModelsAsync(cancellationToken);
            return Ok(models);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("models/pull")]
    public async Task<IActionResult> PullModel([FromQuery] string name, CancellationToken cancellationToken)
    {
        if (!IsEnabled()) return BadRequest(new { message = "AI feature is disabled" });
        try
        {
            await aiServiceClient.PullModelAsync(name, cancellationToken);
            return Ok(new { message = "Model pull started" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("models/{name}")]
    public async Task<IActionResult> DeleteModel(string name, CancellationToken cancellationToken)
    {
        if (!IsEnabled()) return BadRequest(new { message = "AI feature is disabled" });
        try
        {
            await aiServiceClient.DeleteModelAsync(name, cancellationToken);
            return Ok(new { message = "Model deleted" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("prompts")]
    public async Task<IActionResult> GetPrompts([FromQuery] bool? isGlobal = null, CancellationToken cancellationToken = default)
    {
        if (!IsEnabled()) return BadRequest(new { message = "AI feature is disabled" });
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized("Invalid user token");

        try
        {
            var prompts = await aiServiceClient.GetPromptsAsync(userId, isGlobal, cancellationToken);
            return Ok(prompts);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("prompts")]
    public async Task<IActionResult> CreatePrompt([FromBody] AiPromptCreateDto request, CancellationToken cancellationToken)
    {
        if (!IsEnabled()) return BadRequest(new { message = "AI feature is disabled" });
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized("Invalid user token");

        if (string.IsNullOrWhiteSpace(request.Prompt))
            return BadRequest(new { message = "Prompt is required" });

        try
        {
            var prompt = await aiServiceClient.CreatePromptAsync(userId, request, cancellationToken);
            return Ok(prompt);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("prompts/{promptId:int}")]
    public async Task<IActionResult> DeletePrompt(int promptId, CancellationToken cancellationToken)
    {
        if (!IsEnabled()) return BadRequest(new { message = "AI feature is disabled" });
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized("Invalid user token");

        try
        {
            await aiServiceClient.DeletePromptAsync(userId, promptId, cancellationToken);
            return NoContent();
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("chat/{chatId:guid}")]
    public async Task<IActionResult> Chat(Guid chatId, [FromBody] AiChatRequestDto request, CancellationToken cancellationToken)
    {
        if (!IsEnabled()) return BadRequest(new { message = "AI feature is disabled" });
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized("Invalid user token");

        if (string.IsNullOrWhiteSpace(request.Prompt))
            return BadRequest(new { message = "Prompt is required" });

        try
        {
            var response = await aiServiceClient.ChatAsync(userId, chatId, request, cancellationToken);
            return Ok(response);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("chat/{chatId:guid}/session")]
    public async Task<IActionResult> ResetSession(Guid chatId, CancellationToken cancellationToken)
    {
        if (!IsEnabled()) return BadRequest(new { message = "AI feature is disabled" });
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized("Invalid user token");

        var chat = await context.Chats.FirstOrDefaultAsync(c => c.Id == chatId && c.IsAi);
        if (chat == null)
            return NotFound("Chat not found");
        if (chat.AiOwnerUserId != userId)
            return Forbid("You don't have access to this chat");

        try
        {
            await aiServiceClient.ResetChatSessionAsync(userId, chatId, cancellationToken);
            return Ok(new { message = "AI session reset" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("chat/{chatId:guid}/history")]
    public async Task<IActionResult> ClearHistory(Guid chatId, CancellationToken cancellationToken)
    {
        if (!IsEnabled()) return BadRequest(new { message = "AI feature is disabled" });
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized("Invalid user token");

        var chat = await context.Chats.FirstOrDefaultAsync(c => c.Id == chatId && c.IsAi);
        if (chat == null)
            return NotFound("Chat not found");
        if (chat.AiOwnerUserId != userId)
            return Forbid("You don't have access to this chat");

        try
        {
            var messages = await context.Messages.Where(m => m.ChatId == chatId).ToListAsync(cancellationToken);
            context.Messages.RemoveRange(messages);
            await context.SaveChangesAsync(cancellationToken);

            await aiServiceClient.ResetChatSessionAsync(userId, chatId, cancellationToken);
            return Ok(new { message = "AI history cleared" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return !string.IsNullOrEmpty(claim) && Guid.TryParse(claim, out userId);
    }
}
