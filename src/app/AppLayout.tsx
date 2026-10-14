// src/app/AppLayout.tsx

import { Layout, Menu, Modal, theme } from "antd";
import type { MenuProps } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { navigationConfig, type NavItem } from "../config/navigation";
import { useUIStore } from "../store/uiStore";
import { useAuthStore } from "../store/authStore";

const { Sider, Content } = Layout;

function toMenuItems(items: NavItem[]): MenuProps["items"] {
  return items.map((item) => ({
    key: item.action ?? item.path ?? item.key,
    icon: item.icon,
    label: item.label,
    children: item.children ? toMenuItems(item.children) : undefined,
  }));
}

export function AppLayout() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const logout = useAuthStore((s) => s.logout);

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "logout") {
      Modal.confirm({
        title: "Log out?",
        content: "You'll need to sign in again to continue.",
        okText: "Log out",
        okButtonProps: { danger: true },
        onOk: () => {
          logout();
          navigate("/login", { replace: true });
        },
      });
      return;
    }
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={sidebarCollapsed}
        onCollapse={toggleSidebar}
        width={240}
      >
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={toMenuItems(navigationConfig)}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        {/* <Header
          style={{
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        /> */}
        <Content
          style={{
            margin: 24,
            background: token.colorBgContainer,
            minHeight: "calc(100vh - 112px)",
            padding: 24,
            borderRadius: token.borderRadiusLG,
            maxWidth: 1200,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
