export type Language = 'vi' | 'en';

export interface Translations {
  nav: {
    newChat: string;
    history: string;
    explore: string;
    settings: string;
    help: string;
    logout: string;
  };
  home: {
    greeting: string;
    askPlaceholder: string;
    uploadTitle: string;
    uploadSubtitle: string;
    termsLink: string;
    privacyLink: string;
    disclaimerMiddle: string;
    disclaimerSuffix: string;
  };
  auth: {
    brand: string;
    welcomeBack: string;
    signInSubtitle: string;
    createAccountTitle: string;
    createAccountSubtitle: string;
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    signIn: string;
    signingIn: string;
    createAccount: string;
    creatingAccount: string;
    noAccount: string;
    signUp: string;
    alreadyHaveAccount: string;
    signInLink: string;
    passwordMismatch: string;
  };
  chat: {
    title: string;
  };
  explore: {
    heroTitlePrefix: string;
    heroTitleSuffix: string;
    heroSubtitle: string;
    disclaimer: string;
  };
  settings: {
    title: string;
    subtitle: string;
    fullNameLabel: string;
    saveChanges: string;
    saving: string;
    changePassword: string;
    changeAvatar: string;
    profileSaved: string;
    profileLoadError: string;
    profileSaveError: string;
    avatarUploadError: string;
    roleLabels: Record<'admin' | 'farmer' | 'agronomist', string>;
    appearance: {
      title: string;
      themeLabel: string;
      themeDesc: string;
      light: string;
      dark: string;
    };
    language: {
      title: string;
      primaryLanguage: string;
      vietnamese: string;
      english: string;
    };
  };
  passwordModal: {
    title: string;
    oldPassword: string;
    newPassword: string;
    confirmNewPassword: string;
    submit: string;
    submitting: string;
    mismatch: string;
    success: string;
    genericError: string;
    close: string;
  };
}

export const translations: Record<Language, Translations> = {
  vi: {
    nav: {
      newChat: 'Đoạn chat mới',
      history: 'Lịch sử chat',
      explore: 'Khám phá',
      settings: 'Cài đặt',
      help: 'Trợ giúp',
      logout: 'Đăng xuất',
    },
    home: {
      greeting: 'Hỗ trợ các bác nông dân tư vấn bệnh cây trồng!',
      askPlaceholder: 'Hỏi Chat bot hỗ trợ các bác nông dân',
      uploadTitle: 'Tải ảnh cây trồng bị bệnh',
      uploadSubtitle: 'Kéo thả ảnh vào đây hoặc bấm để chọn file',
      termsLink: 'Điều khoản',
      privacyLink: 'Chính sách quyền riêng tư',
      disclaimerMiddle: 'và',
      disclaimerSuffix: 'được áp dụng. Chat bot có thể trả lời sai, hãy kiểm tra lại thông tin quan trọng.',
    },
    auth: {
      brand: 'Chat bot hỗ trợ các bác nông dân',
      welcomeBack: 'Chào mừng trở lại',
      signInSubtitle: 'Đăng nhập để tiếp tục',
      createAccountTitle: 'Tạo tài khoản',
      createAccountSubtitle: 'Bắt đầu hành trình cùng chúng tôi',
      fullName: 'Họ và tên',
      email: 'Email',
      password: 'Mật khẩu',
      confirmPassword: 'Xác nhận mật khẩu',
      signIn: 'Đăng nhập',
      signingIn: 'Đang đăng nhập...',
      createAccount: 'Tạo tài khoản',
      creatingAccount: 'Đang tạo tài khoản...',
      noAccount: 'Chưa có tài khoản?',
      signUp: 'Đăng ký',
      alreadyHaveAccount: 'Đã có tài khoản?',
      signInLink: 'Đăng nhập',
      passwordMismatch: 'Mật khẩu không khớp.',
    },
    chat: {
      title: 'Chat bot hỗ trợ các bác nông dân',
    },
    explore: {
      heroTitlePrefix: 'Gặp gỡ',
      heroTitleSuffix: ', trợ lý AI riêng của bạn',
      heroSubtitle:
        'Khám phá khả năng của AI tạo sinh. Từ viết code phức tạp đến sáng tác nội dung, xem Chat bot có thể nâng cao năng suất của bạn thế nào.',
      disclaimer: 'Chat bot có thể trả lời sai. Luôn kiểm tra lại thông tin quan trọng.',
    },
    settings: {
      title: 'Cài đặt & Tài khoản',
      subtitle: 'Quản lý trải nghiệm AI, quyền riêng tư dữ liệu và thông tin tài khoản của bạn.',
      fullNameLabel: 'Họ và tên',
      saveChanges: 'Lưu thay đổi',
      saving: 'Đang lưu...',
      changePassword: 'Đổi mật khẩu',
      changeAvatar: 'Đổi ảnh đại diện',
      profileSaved: 'Đã lưu thay đổi.',
      profileLoadError: 'Không thể tải thông tin tài khoản.',
      profileSaveError: 'Không thể lưu, thử lại sau.',
      avatarUploadError: 'Tải ảnh đại diện thất bại.',
      roleLabels: {
        admin: 'Quản trị viên',
        farmer: 'Nông dân',
        agronomist: 'Chuyên gia nông nghiệp',
      },
      appearance: {
        title: 'Giao diện',
        themeLabel: 'Chủ đề',
        themeDesc: 'Chọn giao diện sáng hoặc tối cho toàn bộ ứng dụng.',
        light: 'Sáng',
        dark: 'Tối',
      },
      language: {
        title: 'Ngôn ngữ',
        primaryLanguage: 'Ngôn ngữ hiển thị',
        vietnamese: 'Tiếng Việt',
        english: 'Tiếng Anh',
      },
    },
    passwordModal: {
      title: 'Đổi mật khẩu',
      oldPassword: 'Mật khẩu cũ',
      newPassword: 'Mật khẩu mới',
      confirmNewPassword: 'Xác nhận mật khẩu mới',
      submit: 'Đổi mật khẩu',
      submitting: 'Đang đổi...',
      mismatch: 'Mật khẩu mới không khớp.',
      success: 'Đổi mật khẩu thành công.',
      genericError: 'Có lỗi xảy ra, thử lại sau.',
      close: 'Đóng',
    },
  },
  en: {
    nav: {
      newChat: 'New Chat',
      history: 'History',
      explore: 'Explore',
      settings: 'Settings',
      help: 'Help',
      logout: 'Log out',
    },
    home: {
      greeting: 'Helping farmers diagnose plant diseases!',
      askPlaceholder: 'Ask the Farmer Support Chatbot',
      uploadTitle: 'Upload a photo of the diseased plant',
      uploadSubtitle: 'Drag and drop an image here, or click to choose a file',
      termsLink: 'Terms',
      privacyLink: 'Privacy Policy',
      disclaimerMiddle: 'and',
      disclaimerSuffix: 'apply. The chatbot can make mistakes, always verify important information.',
    },
    auth: {
      brand: 'Farmer Support Chatbot',
      welcomeBack: 'Welcome back',
      signInSubtitle: 'Sign in to continue',
      createAccountTitle: 'Create your account',
      createAccountSubtitle: 'Start your journey with us',
      fullName: 'Full name',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      signIn: 'Sign in',
      signingIn: 'Signing in...',
      createAccount: 'Create account',
      creatingAccount: 'Creating account...',
      noAccount: "Don't have an account?",
      signUp: 'Sign up',
      alreadyHaveAccount: 'Already have an account?',
      signInLink: 'Sign in',
      passwordMismatch: 'Passwords do not match.',
    },
    chat: {
      title: 'Farmer Support Chatbot',
    },
    explore: {
      heroTitlePrefix: 'Meet',
      heroTitleSuffix: ', your personal AI assistant',
      heroSubtitle:
        'Explore the possibilities of generative AI. From crafting complex code to writing creative stories, discover how the chatbot can enhance your productivity.',
      disclaimer: 'The chatbot is AI and can make mistakes. Always check critical information.',
    },
    settings: {
      title: 'Settings & Account',
      subtitle: 'Manage your AI experience, data privacy, and account details.',
      fullNameLabel: 'Full name',
      saveChanges: 'Save changes',
      saving: 'Saving...',
      changePassword: 'Change password',
      changeAvatar: 'Change avatar',
      profileSaved: 'Changes saved.',
      profileLoadError: 'Could not load account information.',
      profileSaveError: 'Could not save, please try again.',
      avatarUploadError: 'Avatar upload failed.',
      roleLabels: {
        admin: 'Admin',
        farmer: 'Farmer',
        agronomist: 'Agronomist',
      },
      appearance: {
        title: 'Appearance',
        themeLabel: 'Theme',
        themeDesc: 'Choose a light or dark theme for the whole app.',
        light: 'Light',
        dark: 'Dark',
      },
      language: {
        title: 'Language',
        primaryLanguage: 'Display language',
        vietnamese: 'Vietnamese',
        english: 'English',
      },
    },
    passwordModal: {
      title: 'Change password',
      oldPassword: 'Old password',
      newPassword: 'New password',
      confirmNewPassword: 'Confirm new password',
      submit: 'Change password',
      submitting: 'Changing...',
      mismatch: 'New passwords do not match.',
      success: 'Password changed successfully.',
      genericError: 'Something went wrong, please try again.',
      close: 'Close',
    },
  },
};
