using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EWHQ.Api.Services;

namespace EWHQ.Api.Controllers;

[ApiController]
[Route("api/admin/[controller]")]
[Authorize]
public class AdminInvitationController : ControllerBase
{
    private readonly IClerkUserService _clerkUserService;
    private readonly ILogger<AdminInvitationController> _logger;

    public AdminInvitationController(
        IClerkUserService clerkUserService,
        ILogger<AdminInvitationController> logger)
    {
        _clerkUserService = clerkUserService;
        _logger = logger;
    }

    [HttpPost("invite")]
    public async Task<IActionResult> InviteAdminUser([FromBody] InviteAdminUserRequest request)
    {
        if (!User.IsInRole("SuperAdmin") && !User.IsInRole("Admin"))
        {
            return Forbid();
        }

        try
        {
            _logger.LogInformation($"Inviting admin user: {request.Email}");

            var invitation = await _clerkUserService.InviteUserAsync(
                request.Email,
                request.FirstName,
                request.LastName,
                request.Role);

            return Ok(new
            {
                success = true,
                message = $"Invitation sent to {request.Email}. They will receive a Clerk invitation email to create their account.",
                invitationId = invitation.InvitationId,
                invitationUrl = invitation.InvitationUrl
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error inviting admin user: {request.Email}");
            return StatusCode(500, new { message = "Failed to send invitation", error = ex.Message });
        }
    }
}

public class InviteAdminUserRequest
{
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Role { get; set; } = "Admin";
}
