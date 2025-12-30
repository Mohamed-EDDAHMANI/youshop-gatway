export function sanitizeBody(body: any) {
  const safeBody = { ...body };
  if (safeBody.password) safeBody.password = '***';
  if (safeBody.refreshToken) safeBody.refreshToken = '***';
  if (safeBody.accessToken) safeBody.accessToken = '***';
  return safeBody;
}
