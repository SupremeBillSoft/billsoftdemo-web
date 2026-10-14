import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Checkbox, Form, Input, Row, Col, Typography, theme } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { loginSchema, type LoginFormValues } from "./schema";
import { useAuthStore } from "../../store/authStore";
import { useState } from "react";

const { Title, Text, Link } = Typography;

export function LoginPage() {
  const { token } = theme.useToken();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { userId: "", password: "" },
  });

  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [rememberMe, setRememberMe] = useState(false);

  const onSubmit = async (values: LoginFormValues) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    login({ id: "mock-user-1", name: values.userId, userId: values.userId, tenantId: "mock-tenant" });
    navigate("/", { replace: true });
  };

  return (
    <div style={{ minHeight: "100vh", background: token.colorBgLayout }}>
      <Row style={{ minHeight: "100vh" }}>
        <Col
          xs={0}
          md={11}
          style={{
            background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryActive})`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: 56,
          }}
        >
          <Title style={{ color: "#fff", marginBottom: 8 }}>BillSoft</Title>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 16 }}>
            GST-ready billing, built for how your business actually works.
          </Text>
        </Col>

        <Col xs={24} md={13} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              background: token.colorBgContainer,
              padding: 32,
              borderRadius: token.borderRadiusLG,
              boxShadow: token.boxShadowSecondary,
            }}
          >
            <Title level={3} style={{ marginBottom: 4, color: token.colorTextHeading }}>
              Sign in
            </Title>
            <Text type="secondary">Enter your credentials to continue</Text>

            <Form layout="vertical" onFinish={handleSubmit(onSubmit)} requiredMark={false} style={{ marginTop: 24 }}>
              <Form.Item
                label="User ID"
                validateStatus={errors.userId ? "error" : ""}
                help={errors.userId?.message}
              >
                <Controller
                  name="userId"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      size="large"
                      prefix={<UserOutlined style={{ color: token.colorTextTertiary }} />}
                      autoComplete="username"
                      placeholder="Enter your User ID"
                      aria-invalid={!!errors.userId}
                    />
                  )}
                />
              </Form.Item>

              <Form.Item
                label="Password"
                validateStatus={errors.password ? "error" : ""}
                help={errors.password?.message}
              >
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <Input.Password
                      {...field}
                      size="large"
                      prefix={<LockOutlined style={{ color: token.colorTextTertiary }} />}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      aria-invalid={!!errors.password}
                    />
                  )}
                />
              </Form.Item>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}>
                  Remember me
                </Checkbox>
                <Link href="#" onClick={(e) => e.preventDefault()}>
                  Forgot password?
                </Link>
              </div>

              <Button type="primary" htmlType="submit" loading={isSubmitting} block size="large">
                Sign in
              </Button>
            </Form>
          </div>
        </Col>
      </Row>
    </div>
  );
}