import {
  DatabaseOutlined,
  MessageOutlined,
  TeamOutlined,
  RobotOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  PaperClipOutlined,
} from "@ant-design/icons-vue"

/** @type {Record<string, object>} icon key → Ant Design Vue icon component */
const AUDIT_ICONS = {
  database: DatabaseOutlined,
  message: MessageOutlined,
  team: TeamOutlined,
  robot: RobotOutlined,
  appstore: AppstoreOutlined,
  file: FileTextOutlined,
  user: UserOutlined,
  safety: SafetyCertificateOutlined,
  paperclip: PaperClipOutlined,
}

/**
 * Resolve an audit icon key to an Ant Design Vue icon component.
 * @param {string} key
 * @returns {object} Ant icon component (defaults to FileTextOutlined).
 */
export function auditIcon(key) {
  return AUDIT_ICONS[key] || FileTextOutlined
}
