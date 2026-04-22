import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: "admin@shipeh.com" } });
  if (existing) {
    console.log("Admin user already exists. Skipping seed.");
    return;
  }

  const passwordHash = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.create({
    data: {
      email: "admin@shipeh.com",
      name: "Admin",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("Created admin user:", admin.email);
  console.log("Login: admin@shipeh.com / admin123");
  console.log("IMPORTANT: Change the password after first login!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
