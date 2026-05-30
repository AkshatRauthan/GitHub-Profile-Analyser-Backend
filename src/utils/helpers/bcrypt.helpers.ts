import bcrypt from 'bcryptjs';

const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
};

const comparePassword = async (
    candidatePassword: string,
    hashedPassword: string
): Promise<boolean> => {
    if (!hashedPassword) return false;
    return bcrypt.compare(candidatePassword, hashedPassword);
};

export default {
    hashPassword,
    comparePassword,
}