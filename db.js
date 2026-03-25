// TITANBET DATABASE WRAPPER (MOCK FIREBASE)
// Bu modül verileri şimdilik localStorage'da tutar ancak Firebase hazır olduğunda 
// tek bir yerden tüm uygulamayı buluta bağlamanızı sağlar.

const DB = {
    // Verileri senkronize etme (Cloud yerine şimdilik geliştirilmiş localStorage)
    async getUsers() {
        return JSON.parse(localStorage.getItem('tb_users') || '[]');
    },
    async saveUsers(users) {
        localStorage.setItem('tb_users', JSON.stringify(users));
    },
    async getBanks() {
        return JSON.parse(localStorage.getItem('tb_banks') || '[]');
    },
    async saveBanks(banks) {
        localStorage.setItem('tb_banks', JSON.stringify(banks));
    },
    async getPendingDeposits() {
        return JSON.parse(localStorage.getItem('tb_pending_deposit') || 'null');
    },
    async savePendingDeposit(deposit) {
        localStorage.setItem('tb_pending_deposit', JSON.stringify(deposit));
    },
    async getAdminProfile() {
        return JSON.parse(localStorage.getItem('tb_admin_profile') || '{"name": "Admin", "char": "A"}');
    },
    async saveAdminProfile(profile) {
        localStorage.setItem('tb_admin_profile', JSON.stringify(profile));
    }
};

// Gerçek Firebase Entegrasyonu İçin Not:
// Gerçek bir veritabanına geçtiğinizde buradaki fonksiyonlar Firestore 'collection'larına istek atacaktır.
// Şimdilik sistemin yapısını bozmadan çoklu kullanıcıya hazır hale getirdik.
