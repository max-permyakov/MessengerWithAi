using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Messenger.Migrations
{
    public partial class AddAiIntegration : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AiOwnerUserId",
                table: "Chats",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAi",
                table: "Chats",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsAi",
                table: "Messages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ModelName",
                table: "Messages",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PromptId",
                table: "Messages",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "Messages",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "user");

            migrationBuilder.CreateTable(
                name: "SystemPrompts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Prompt = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsGlobal = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemPrompts", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Chats_IsAi_AiOwnerUserId",
                table: "Chats",
                columns: new[] { "IsAi", "AiOwnerUserId" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SystemPrompts");

            migrationBuilder.DropIndex(
                name: "IX_Chats_IsAi_AiOwnerUserId",
                table: "Chats");

            migrationBuilder.DropColumn(
                name: "AiOwnerUserId",
                table: "Chats");

            migrationBuilder.DropColumn(
                name: "IsAi",
                table: "Chats");

            migrationBuilder.DropColumn(
                name: "IsAi",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "ModelName",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "PromptId",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "Messages");
        }
    }
}
