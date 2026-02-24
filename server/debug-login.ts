
import prisma from './src/prisma';
import bcrypt from 'bcryptjs';

async function main() {
    console.log("Debugging login for 'nurse'...");

    try {
        const user = await prisma.user.findUnique({
            where: { username: 'nurse' }
        });

        if (!user) {
            console.error("User 'nurse' NOT FOUND in database!");
            return;
        }

        console.log("User found:", {
            id: user.id,
            username: user.username,
            role: user.role,
            passwordHash: user.passwordHash
        });

        const inputPassword = 'password';
        const isMatch = await bcrypt.compare(inputPassword, user.passwordHash);

        console.log(`Checking password '${inputPassword}' against hash...`);
        console.log("Match Result:", isMatch);

        if (isMatch) {
            console.log("SUCCESS: Password is correct. The issue might be in the API payload or Controller logic.");
        } else {
            console.error("FAILURE: Password/Hash mismatch. The seed script might have failed or used a different salt/method.");
        }

    } catch (error) {
        console.error("Debug script error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
