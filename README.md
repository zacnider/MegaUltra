# MegaUltra - Kurulum ve Kullanım Kılavuzu

## Kurulum Adımları

1. **Repoyu Klonla**
```bash
git clone https://github.com/zacnider/MegaUltra.git
cd MegaUltra
 ```

3. **Bağımlılıkları Yükleme**
  
   ```bash
   npm install
   ```

   Eğer hata alırsanız, aşağıdaki komutları tek tek çalıştırabilirsiniz:
   ```bash
   npm install colors@1.4.0
   npm install dotenv@16.0.3
   npm install ethers@5.7.2
   npm install figlet@1.6.0
   npm install gradient-string@2.0.2
   npm install inquirer@8.2.5
   npm install ora@5.4.1
   ```

4. **Programı Çalıştırma**
  ```bash
   screen -S mega
   ```

   ```bash
   node main.js
   ```

## Kullanım Kılavuzu

1. **Private Key Yönetimi**

   `.env` dosyasında şu iki formatta private key ekleyebilirsiniz:
   
   - Tek cüzdan için:
   ```
   PRIVATE_KEY=0x123...
   ```
   
   - Çoklu cüzdanlar için:
   ```
   PRIVATE_KEY_1=0x123...
   PRIVATE_KEY_2=0x456...
   PRIVATE_KEY_3=0x789...
   ```
   
   İstediğiniz kadar cüzdan ekleyebilirsiniz,private keylerin başında muhakkak "0x"olsun. program bunları otomatik olarak tanıyacaktır.

2. **RPC URL Yapılandırması**

   `.env` dosyasında tek bir RPC URL'i ayarlamanız yeterlidir:
   ```
   RPC_URL=https://carrot.megaeth.com/rpc
   ```
   
   Bu RPC URL hem GTE Swapper hem de Cap Minter tarafından kullanılacaktır.

2. **Menü Seçenekleri**

   Program başlatıldığında şu seçenekler sunulacaktır:
   
   - 🛠️ **Modülleri Yapılandır**: Hangi modülleri kullanacağınızı seçebilirsiniz
   - ⚙️ **Ayarları Düzenle**: Döngü sayısı ve tx sınırları gibi ayarları değiştirebilirsiniz
   - ▶️ **Farming İşlemini Başlat**: Swap işlemlerini başlatır
   - 🔍 **Wallet Bakiyelerini Göster**: Tüm cüzdanlarınızın bakiyelerini gösterir
   - 📊 **İstatistikleri Göster**: İşlem istatistiklerini görüntüler
   - ❌ **Çıkış**: Programdan çıkış yapar

3. **Swap İşlemi Detayları**

   - ETH -> Token: Bakiyenizin %10-20'si arasında rastgele bir miktarla swap yapar
   - Token -> ETH: Token bakiyenizin %100'ünü kullanarak swap yapar

4. **Döngü Ayarları**

   - **Sonsuz Döngü**: Program durdurana kadar swap işlemlerini tekrarlar
   - **Belirli Sayıda Döngü**: Ayarladığınız sayıda döngü tamamlandıktan sonra durur
   - **Günlük TX/Cüzdan**: Her cüzdan için günlük maksimum işlem sayısını belirler

## Sorun Giderme

1. **Modül hataları**
   
   Eğer "Cannot find module" hatası alırsanız, bağımlılıkların doğru şekilde yüklendiğinden emin olun.
   
2. **RPC Hataları**
   
   RPC URL'nin doğru olduğundan emin olun. Gerekirse `.env` dosyasındaki URL'yi güncelleyin:
   ```
   RPC_URL=https://carrot.megaeth.com/rpc
   ```
   
3. **Private Key Sorunları**
   
   Private key'lerin doğru formatta olduğundan emin olun (0x ile başlamalı).
   
4. **Chain ID Bilgileri**
   
   Her iki modül de aynı ağı kullanacak şekilde yapılandırılmıştır. Chain ID kontrolü devre dışı bırakılmıştır.
