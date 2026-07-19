(function initializeAuthContext(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.AuthContext = api;
    }
})(typeof window !== 'undefined' ? window : null, function createAuthContext() {
    function resolveAuthHeaders(options) {
        const {
            isBusinessPage,
            isAdminPage,
            adminToken,
            businessToken,
            userToken,
            impersonateField
        } = options;

        if (isAdminPage && adminToken) {
            return { 'x-admin-token': adminToken };
        }

        if (isBusinessPage) {
            if (adminToken && impersonateField) {
                return { 'x-admin-token': adminToken };
            }
            if (businessToken) {
                return { Authorization: `Bearer ${businessToken}` };
            }
            return {};
        }

        if (!isAdminPage && userToken) {
            return { Authorization: `Bearer ${userToken}` };
        }

        return {};
    }

    return { resolveAuthHeaders };
});
