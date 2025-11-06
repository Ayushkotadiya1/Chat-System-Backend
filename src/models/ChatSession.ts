import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../db/connection';

/**
 * ChatSession attributes interface
 */
interface ChatSessionAttributes {
  id: number;
  sessionId: string;
  userIp?: string | null;
  userAgent?: string | null;
  status: 'active' | 'inactive' | 'closed';
  aiEnabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * ChatSession creation attributes
 */
interface ChatSessionCreationAttributes extends Optional<ChatSessionAttributes, 'id' | 'userIp' | 'userAgent' | 'status' | 'createdAt' | 'updatedAt'> { }

/**
 * ChatSession model class
 * Represents chat sessions between customers and admins
 */
class ChatSession extends Model<ChatSessionAttributes, ChatSessionCreationAttributes> implements ChatSessionAttributes {
  public id!: number;
  public sessionId!: string;
  public userIp?: string | null;
  public userAgent?: string | null;
  public status!: 'active' | 'inactive' | 'closed';
  public aiEnabled?: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

/**
 * Initialize ChatSession model
 */
ChatSession.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'session_id',
      validate: {
        notEmpty: true,
      },
    },
    userIp: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'user_ip',
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'closed'),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'inactive', 'closed']],
      },
    },
    aiEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'ai_enabled',
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
    tableName: 'chat_sessions',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['session_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['updated_at'],
      },
    ],
  }
);

export default ChatSession;

