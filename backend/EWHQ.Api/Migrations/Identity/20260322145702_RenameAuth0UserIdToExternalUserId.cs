using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EWHQ.Api.Migrations.Identity
{
    /// <inheritdoc />
    public partial class RenameAuth0UserIdToExternalUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Auth0UserId",
                table: "Users",
                newName: "ExternalUserId");

            migrationBuilder.RenameIndex(
                name: "IX_Users_Auth0UserId_public",
                table: "Users",
                newName: "IX_Users_ExternalUserId_public");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ExternalUserId",
                table: "Users",
                newName: "Auth0UserId");

            migrationBuilder.RenameIndex(
                name: "IX_Users_ExternalUserId_public",
                table: "Users",
                newName: "IX_Users_Auth0UserId_public");
        }
    }
}
