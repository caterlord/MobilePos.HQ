using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EWHQ.Api.Data.Migrations.Admin
{
    /// <inheritdoc />
    public partial class AddAccessAuditLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AccessAuditLogs",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TeamId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ActionType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ActorUserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: true),
                    TargetUserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: true),
                    TargetEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Details = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccessAuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AccessAuditLogs_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AccessAuditLogs_ActionType",
                table: "AccessAuditLogs",
                column: "ActionType");

            migrationBuilder.CreateIndex(
                name: "IX_AccessAuditLogs_TeamId_CreatedAt",
                table: "AccessAuditLogs",
                columns: new[] { "TeamId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AccessAuditLogs");
        }
    }
}
