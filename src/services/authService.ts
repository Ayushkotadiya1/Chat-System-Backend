import User from '../models/User';

/**
 * Find user by username
 * @param username - Username to search for
 * @returns Promise with user or null
 */
export async function findUserByUsername(username: string) {
  try {
    const user = await User.findOne({
      where: { username },
      attributes: ['id', 'username', 'passwordHash', 'role', 'createdAt', 'updatedAt'],
    });
    return user;
  } catch (error) {
    console.error('Error finding user by username:', error);
    throw error;
  }
}

/**
 * Find user by ID
 * @param userId - User ID to search for
 * @returns Promise with user or null
 */
export async function findUserById(userId: number) {
  try {
    const user = await User.findOne({
      where: { id: userId },
      attributes: ['id', 'username', 'role', 'createdAt', 'updatedAt'],
    });
    return user;
  } catch (error) {
    console.error('Error finding user by ID:', error);
    throw error;
  }
}

