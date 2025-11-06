import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../db/connection';

/**
 * User attributes interface
 */
interface UserAttributes {
  id: number;
  username: string;
  passwordHash: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User creation attributes (optional id, timestamps)
 */
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

/**
 * User model class
 * Represents admin users in the system
 */
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public username!: string;
  public passwordHash!: string;
  public role!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

/**
 * Initialize User model
 */
User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 255],
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash',
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'admin',
      validate: {
        isIn: [['admin', 'moderator']],
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'users',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['username'],
      },
    ],
  }
);

export default User;

