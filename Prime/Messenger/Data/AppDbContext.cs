using Messenger.Models;
using Microsoft.EntityFrameworkCore;

namespace Messenger
{

    public class AppDbContext : DbContext
    {

        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        // Твои DbSet-ы
        public DbSet<User> Users { get; set; }
        public DbSet<Chat> Chats { get; set; }
        public DbSet<ChatUser> ChatUsers { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<SystemPrompt> SystemPrompts { get; set; }

     
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

       
            modelBuilder.Entity<ChatUser>()
                .HasKey(cu => new { cu.ChatId, cu.UserId });

            modelBuilder.Entity<ChatUser>()
                .HasOne(cu => cu.Chat)
                .WithMany(c => c.ChatUsers)
                .HasForeignKey(cu => cu.ChatId)
                .OnDelete(DeleteBehavior.Cascade);   

            modelBuilder.Entity<ChatUser>()
                .HasOne(cu => cu.User)
                .WithMany(u => u.ChatUsers)
                .HasForeignKey(cu => cu.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Message → Chat (один-ко-многим)
            modelBuilder.Entity<Message>()
                .HasOne(m => m.Chat)
                .WithMany(c => c.Messages)
                .HasForeignKey(m => m.ChatId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Message>()
                .HasOne(m => m.Sender)
                .WithMany(u => u.SentMessages)
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);  

            modelBuilder.Entity<Chat>()
                .HasIndex(c => new { c.IsAi, c.AiOwnerUserId })
                .HasDatabaseName("IX_Chats_IsAi_AiOwnerUserId");
        }
    }

      
    }
