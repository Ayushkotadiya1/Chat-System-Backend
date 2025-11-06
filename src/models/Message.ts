import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../db/connection';
import ChatSession from './ChatSession';

/**
 * Message attributes interface
 */
interface MessageAttributes {
  id: number;
  sessionId: string;
  message: string;
  sender: string;
  senderType: 'user' | 'admin';
  isAi: boolean;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  createdAt?: Date;
}

/**
 * Message creation attributes
 */
interface MessageCreationAttributes extends Optional<MessageAttributes, 'id' | 'isAi' | 'createdAt'> { }

/**
 * Message model class
 * Represents individual chat messages
 */
class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
  public id!: number;
  public sessionId!: string;
  public message!: string;
  public sender!: string;
  public senderType!: 'user' | 'admin';
  public isAi!: boolean;
  public attachmentUrl?: string | null;
  public attachmentType?: string | null;
  public readonly createdAt!: Date;

  // Association
  public chatSession?: ChatSession;
}

/**
 * Initialize Message model
 */
Message.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'session_id',
      references: {
        model: 'chat_sessions',
        key: 'session_id',
      },
      onDelete: 'CASCADE',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 5001],
      },
    },
    sender: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 50],
      },
    },
    senderType: {
      type: DataTypes.ENUM('user', 'admin'),
      allowNull: false,
      field: 'sender_type',
      validate: {
        isIn: [['user', 'admin']],
      },
    },
    isAi: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_ai',
    },
    attachmentUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'attachment_url',
    },
    attachmentType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'attachment_type',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'messages',
    underscored: true,
    timestamps: false, // Only createdAt, no updatedAt
    indexes: [
      {
        fields: ['session_id'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['sender_type'],
      },
    ],
  }
);

/**
 * Define associations
 */
Message.belongsTo(ChatSession, {
  foreignKey: 'sessionId',
  targetKey: 'sessionId',
  as: 'chatSession',
});

ChatSession.hasMany(Message, {
  foreignKey: 'sessionId',
  sourceKey: 'sessionId',
  as: 'messages',
});

export default Message;

