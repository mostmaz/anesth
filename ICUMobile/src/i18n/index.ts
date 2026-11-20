import { useICU } from '../data/mockICU';

export type Lang = 'en' | 'ar';

const en: Record<string, string> = {
    'app.name': 'ICU Manager',
    'nav.signOut': 'Sign Out',
    'lang.language': 'Language',

    // Dashboard
    'dash.greeting.morning': 'Good morning',
    'dash.greeting.afternoon': 'Good afternoon',
    'dash.greeting.evening': 'Good evening',
    'dash.commandCenter': 'ICU Command Center',
    'dash.patients': 'PATIENTS',
    'dash.active': 'Active',
    'dash.archived': 'Archived',
    'dash.admit': 'Admit',
    'dash.endShift': 'End Shift',

    // Patient tabs
    'tab.overview': 'Overview',
    'tab.rounds': 'Rounds',
    'tab.vitals': 'Vitals',
    'tab.events': 'Events',
    'tab.mar': 'MAR',
    'tab.io': 'I/O',
    'tab.labs': 'Labs',
    'tab.orders': 'Orders',
    'tab.nursing': 'Nursing',
    'tab.ventilator': 'Ventilator',
    'tab.interventions': 'Interventions',
    'tab.consultation': 'Consultation',
    'tab.notes': 'Notes',
    'tab.handover': 'Handover',

    // Patient header / actions
    'hdr.checkIn': 'Check-in',
    'hdr.discharge': 'Discharge',
    'btn.add': 'Add',
    'btn.cancel': 'Cancel',
    'btn.confirm': 'Confirm',
    'btn.save': 'Save',
    'btn.administer': 'Administer',
    'btn.startInfusion': 'Start Infusion',

    // Login
    'login.subtitle': 'Sign in to access patient records',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.signIn': 'Sign In',

    // Password
    'password.title': 'Change password',
    'password.current': 'Current password',
    'password.enterCurrent': 'Enter your current password',
    'password.new': 'New password (at least 8 characters)',
    'password.confirm': 'Confirm new password',
    'password.save': 'Save password',
    'password.changed': 'Password changed',
    'password.failed': 'Could not change password',
    'password.tooShort': 'Password must be at least 8 characters',
    'password.notDefault': 'Choose a password other than "password"',
    'password.mismatch': 'The two new passwords do not match',
    'password.forcedNotice': 'This account still uses the shared default password. Set your own password to continue.',
};

const ar: Record<string, string> = {
    'app.name': 'إدارة العناية المركزة',
    'nav.signOut': 'تسجيل الخروج',
    'lang.language': 'اللغة',

    'dash.greeting.morning': 'صباح الخير',
    'dash.greeting.afternoon': 'مساء الخير',
    'dash.greeting.evening': 'مساء الخير',
    'dash.commandCenter': 'مركز إدارة العناية المركزة',
    'dash.patients': 'المرضى',
    'dash.active': 'نشط',
    'dash.archived': 'مؤرشف',
    'dash.admit': 'إدخال مريض',
    'dash.endShift': 'إنهاء المناوبة',

    'tab.overview': 'نظرة عامة',
    'tab.rounds': 'الجولة',
    'tab.vitals': 'العلامات الحيوية',
    'tab.events': 'الأحداث',
    'tab.mar': 'سجل الأدوية',
    'tab.io': 'الوارد/الصادر',
    'tab.labs': 'المختبر',
    'tab.orders': 'الأوامر',
    'tab.nursing': 'التمريض',
    'tab.ventilator': 'جهاز التنفس',
    'tab.interventions': 'الإجراءات',
    'tab.consultation': 'الاستشارة',
    'tab.notes': 'الملاحظات',
    'tab.handover': 'التسليم',

    'hdr.checkIn': 'تسجيل الحضور',
    'hdr.discharge': 'إخراج',
    'btn.add': 'إضافة',
    'btn.cancel': 'إلغاء',
    'btn.confirm': 'تأكيد',
    'btn.save': 'حفظ',
    'btn.administer': 'إعطاء',
    'btn.startInfusion': 'بدء التسريب',

    'login.subtitle': 'سجّل الدخول للوصول إلى سجلات المرضى',
    'login.username': 'اسم المستخدم',
    'login.password': 'كلمة المرور',
    'login.signIn': 'تسجيل الدخول',

    'password.title': 'تغيير كلمة المرور',
    'password.current': 'كلمة المرور الحالية',
    'password.enterCurrent': 'أدخل كلمة المرور الحالية',
    'password.new': 'كلمة المرور الجديدة (٨ أحرف على الأقل)',
    'password.confirm': 'تأكيد كلمة المرور الجديدة',
    'password.save': 'حفظ كلمة المرور',
    'password.changed': 'تم تغيير كلمة المرور',
    'password.failed': 'تعذّر تغيير كلمة المرور',
    'password.tooShort': 'يجب ألا تقل كلمة المرور عن ٨ أحرف',
    'password.notDefault': 'اختر كلمة مرور غير «password»',
    'password.mismatch': 'كلمتا المرور الجديدتان غير متطابقتين',
    'password.forcedNotice': 'هذا الحساب ما زال يستخدم كلمة المرور الافتراضية المشتركة. عيّن كلمة مرور خاصة بك للمتابعة.',
};

const dicts: Record<Lang, Record<string, string>> = { en, ar };

export function translate(lang: Lang, key: string, fallback?: string): string {
    return dicts[lang]?.[key] ?? dicts.en[key] ?? fallback ?? key;
}

// Hook: returns { t, lang, dir } and reactively re-renders on language change.
export function useT() {
    const lang = useICU(s => s.lang);
    return {
        lang,
        dir: (lang === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
        t: (key: string, fallback?: string) => translate(lang, key, fallback),
    };
}
