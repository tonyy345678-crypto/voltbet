# 🚀 TitanBet Platformu Yayına Alma Rehberi (Deployment Guide)

TitanBet'i başkalarının da kullanabilmesi için internete yüklemeniz gerekmektedir. İşte en popüler ve ücretsiz iki seçenek:

---

## 🏆 Seçenek 1: Vercel (En Kolayı)
1.  **Vercel'e Giriş Yapın**: [vercel.com](https://vercel.com/) adresine gidin.
2.  **Sürükle & Bırak**: Ana sayfanızda "Add New" -> "Project" yerine, dosyalarınızı direkt Vercel'e sürükleyip bırakabileceğiniz "Dashboard" kısmına gidin.
3.  **Klasörü Yükleyin**: Bilgisayarınızdaki `TitanBet_Platform` klasörünü Vercel arayüzüne sürükleyin.
4.  **Bitti!**: Vercel size saniyeler içinde `titanbet.vercel.app` gibi bir link verecektir.

---

## 💎 Seçenek 2: Netlify (En Hızlısı)
1.  [app.netlify.com/drop](https://app.netlify.com/drop) adresine gidin.
2.  Bilgisayarınızdaki `TitanBet_Platform` klasörünü beyaz kutunun içine sürükleyin.
3.  Yüklendikten sonra siteniz anında yayına girecektir.

---

## 🛠️ Önemli Notlar:
-   **Firebase**: Herkesin aynı bakiye ve bankaları görmesini istiyorsanız, `firebase_config.js` dosyasındaki bilgileri kendi Firebase hesabınızdan alarak güncellemelisiniz. (Aksi takdirde veriler sadece o tarayıcıya özel kalır).
-   **Domain**: İsterseniz ileride kendi `.com` alan adınızı bu servislere bağlayabilirsiniz.

Başka bir sorunuz olursa buradayım! 👑💸⚡
