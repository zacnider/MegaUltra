require('dotenv').config();
const colors = require('colors');
const inquirer = require('inquirer');
const figlet = require('figlet');
const gradient = require('gradient-string');
const ora = require('ora');
const { GTESwapper } = require('./modul/gte_swapper');
const { CapMinter } = require('./modul/cap_minter');
const { RaribleFunMinter } = require('./modul/rarible_fun_minter');
// Diğer modülleri buraya ekleyebilirsiniz
// const { ModulName } = require('./modules/modul_name');

// Ana program sınıfı
class MegaEthFarmingController {
    constructor() {
        // Tüm .env dosyasından dinamik olarak private key'leri al
        this.privateKeys = [];
        
        // Olabilecek tüm private key'leri kontrol et (1'den 100'e kadar)
        for (let i = 1; i <= 100; i++) {
            const keyName = `PRIVATE_KEY_${i}`;
            if (process.env[keyName]) {
                this.privateKeys.push(process.env[keyName]);
            }
        }
        
        // Ek olarak sadece PRIVATE_KEY şeklinde tanımlanmış bir key de olabilir
        if (process.env.PRIVATE_KEY) {
            this.privateKeys.push(process.env.PRIVATE_KEY);
        }

        // Kullanılabilir modüller (Daha fazla modül eklenebilir)
        this.modules = {
            'gte_swapper': {
                name: 'GTE Swapper',
                description: 'ETH <-> Token swap işlemleri gerçekleştirir',
                module: GTESwapper
            },
              'cap_minter': {
                name: 'Cap cUSD Minter',
                description: 'Cap ağında cUSD token mint işlemi gerçekleştirir',
                module: CapMinter
             }, 

               'rarible_fun_minter': {
                name: 'Rarible Fun NFT Minter',
                description: 'Rarible.fun üzerinde "Fun Starts Here" NFT mint eder',
                module: RaribleFunMinter
            },
            // Diğer modülleri buraya ekleyebilirsiniz
            // 'module_name': {
            //    name: 'Module Display Name',
            //    description: 'Module Description',
            //    module: ModuleClass
            // }
      
          };

        this.settings = {
            infiniteLoop: false,
            loopCount: 1,
            dailyTxPerWallet: 10,
            selectedModules: []
        };
    }

    // Programı başlat
    async start() {
        await this.displayBanner();
        
        if (this.privateKeys.length === 0) {
            console.error(colors.red("🚨 Hiçbir private key bulunamadı! Lütfen .env dosyanızı kontrollü edin."));
            return;
        }

        console.log(colors.green(`🔑 ${this.privateKeys.length} adet cüzdan bulundu.`));
        
        let exit = false;
        while (!exit) {
            exit = await this.showMainMenu();
        }
    }

    // Büyük ve renkli banner göster
    async displayBanner() {
        return new Promise((resolve) => {
            figlet('MegaETH Farming', {
                font: 'ANSI Shadow',
                horizontalLayout: 'default',
                verticalLayout: 'default'
            }, (err, data) => {
                if (err) {
                    console.log(colors.red('Banner gösterilirken hata oluştu!'));
                    resolve();
                    return;
                }
                
                // Gradyan efektli banner
                console.log(gradient.rainbow(data));
                console.log(gradient.pastel('\n🚀 MegaETH Farming Kontrol Paneli 🚀\n'));
                console.log(colors.cyan('▓'.repeat(80)));
                console.log(colors.yellow('👨‍🌾 MegaETH Farming  bot\'una hoş geldiniz! 👨‍🌾'));
                console.log(colors.cyan('▓'.repeat(80)) + '\n');
                
                resolve();
            });
        });
    }

    // Ana menüyü göster
    async showMainMenu() {
        console.log('\n');
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: '🔄 Ne yapmak istersiniz?',
                choices: [
                    { name: '🛠️  Modülleri Yapılandır', value: 'configureModules' },
                    { name: '⚙️  Ayarları Düzenle', value: 'settings' },
                    { name: '▶️  Farming İşlemini Başlat', value: 'start' },
                    { name: '🔍  Wallet Bakiyelerini Göster', value: 'showBalances' },
                    { name: '📊  İstatistikleri Göster', value: 'stats' },
                    { name: '❌  Çıkış', value: 'exit' }
                ]
            }
        ]);

        switch (action) {
            case 'configureModules':
                await this.configureModules();
                break;
            case 'settings':
                await this.configureSettings();
                break;
            case 'start':
                await this.startFarming();
                break;
            case 'showBalances':
                await this.showBalances();
                break;
            case 'stats':
                await this.showStats();
                break;
            case 'exit':
                console.log(colors.rainbow('\n👋 GTE Swapper programını kullandığınız için teşekkürler! Görüşmek üzere!'));
                return true;
        }

        return false;
    }

    // Modülleri yapılandır
    async configureModules() {
        const moduleChoices = Object.keys(this.modules).map(key => ({
            name: `${this.modules[key].name} - ${this.modules[key].description}`,
            value: key,
            checked: this.settings.selectedModules.includes(key)
        }));

        const { selectedModules } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'selectedModules',
                message: '🧩 Hangi modülleri kullanmak istiyorsunuz?',
                choices: moduleChoices,
                validate: (answer) => {
                    if (answer.length < 1) {
                        return 'En az bir modül seçmelisiniz!';
                    }
                    return true;
                }
            }
        ]);

        this.settings.selectedModules = selectedModules;
        console.log(colors.green(`✅ ${selectedModules.length} adet modül seçildi.`));
    }

    // Ayarları yapılandır
    async configureSettings() {
        const { infiniteLoop } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'infiniteLoop',
                message: '🔄 Sonsuz döngü modunu etkinleştirmek istiyor musunuz?',
                default: this.settings.infiniteLoop
            }
        ]);

        this.settings.infiniteLoop = infiniteLoop;

        if (!infiniteLoop) {
            const { loopCount } = await inquirer.prompt([
                {
                    type: 'number',
                    name: 'loopCount',
                    message: '🔢 Kaç döngü çalıştırılsın?',
                    default: this.settings.loopCount,
                    validate: (value) => {
                        if (isNaN(value) || value < 1) {
                            return 'Lütfen 1 veya daha büyük bir sayı girin!';
                        }
                        return true;
                    }
                }
            ]);
            this.settings.loopCount = loopCount;
        }

        const { dailyTxPerWallet } = await inquirer.prompt([
            {
                type: 'number',
                name: 'dailyTxPerWallet',
                message: '📊 Günlük cüzdan başına maksimum işlem sayısı:',
                default: this.settings.dailyTxPerWallet,
                validate: (value) => {
                    if (isNaN(value) || value < 1) {
                        return 'Lütfen 1 veya daha büyük bir sayı girin!';
                    }
                    return true;
                }
            }
        ]);
        this.settings.dailyTxPerWallet = dailyTxPerWallet;

        console.log(colors.green('✅ Ayarlar başarıyla güncellendi:'));
        console.log(colors.yellow(`📌 Sonsuz Döngü: ${this.settings.infiniteLoop ? 'Açık ✅' : 'Kapalı ❌'}`));
        if (!this.settings.infiniteLoop) {
            console.log(colors.yellow(`📌 Döngü Sayısı: ${this.settings.loopCount}`));
        }
        console.log(colors.yellow(`📌 Günlük Cüzdan Başına TX: ${this.settings.dailyTxPerWallet}`));
    }

    // Farming işlemini başlat
    async startFarming() {
        if (this.settings.selectedModules.length === 0) {
            console.log(colors.red('❌ Lütfen önce en az bir modül seçin!'));
            await this.configureModules();
            return;
        }

        console.log(colors.green('\n🚀 Farming işlemi başlatılıyor...'));
        console.log(colors.yellow(`📌 Seçilen Modüller: ${this.settings.selectedModules.map(key => this.modules[key].name).join(', ')}`));
        
        if (this.settings.infiniteLoop) {
            console.log(colors.magenta('⚠️ Sonsuz döngü modu aktif! Programı durdurmak için CTRL+C kullanabilirsiniz.'));
        } else {
            console.log(colors.yellow(`📌 Toplam Çalıştırılacak Döngü: ${this.settings.loopCount}`));
        }

        let loopCounter = 0;
        let continueRunning = true;

        while (continueRunning) {
            loopCounter++;
            
            if (!this.settings.infiniteLoop && loopCounter > this.settings.loopCount) {
                break;
            }

            console.log(colors.rainbow(`\n=== 🌀 DÖNGÜ #${loopCounter} BAŞLADI ===`));
            
            // Seçilen modülleri rastgele sırayla çalıştır
            const shuffledModules = [...this.settings.selectedModules].sort(() => 0.5 - Math.random());
            
            for (const moduleKey of shuffledModules) {
                const moduleInfo = this.modules[moduleKey];
                const spinner = ora({
                    text: `${moduleInfo.name} modülü başlatılıyor...`,
                    color: 'green'
                }).start();
                
                try {
                    const moduleInstance = new moduleInfo.module(this.privateKeys);
                    spinner.succeed(`${moduleInfo.name} modülü başlatıldı!`);
                    
                    console.log(colors.cyan(`\n▶️ ${moduleInfo.name} çalıştırılıyor...`));
                    await moduleInstance.performSwap(); // Her modülün ana fonksiyonu buraya gelebilir
                    console.log(colors.green(`✅ ${moduleInfo.name} başarıyla tamamlandı!\n`));
                    
                    // Modüller arasında rastgele bekle (20-40 saniye)
                    const waitTime = Math.floor(Math.random() * 20000) + 20000;
                    await this.waitWithSpinner(waitTime, `Bir sonraki modüle geçmeden önce bekleniyor...`);
                } catch (error) {
                    spinner.fail(`${moduleInfo.name} çalıştırılırken hata oluştu!`);
                    console.error(colors.red(`❌ Hata: ${error.message}`));
                }
            }
            
            console.log(colors.rainbow(`\n=== 🏁 DÖNGÜ #${loopCounter} TAMAMLANDI ===\n`));
            
            if (!this.settings.infiniteLoop && loopCounter >= this.settings.loopCount) {
                console.log(colors.green(`✅ Toplam ${loopCounter} döngü tamamlandı!`));
                break;
            }
            
            // Döngüler arasında rastgele bekle (2-5 dakika)
            const waitTime = Math.floor(Math.random() * 180000) + 120000;
            await this.waitWithSpinner(waitTime, `Bir sonraki döngüye geçmeden önce bekleniyor...`);
        }
        
        console.log(colors.green('\n🎉 Farming işlemi tamamlandı!\n'));
    }

    // Beklerken spinner göster
    async waitWithSpinner(ms, text) {
        return new Promise(resolve => {
            const spinner = ora({
                text: `${text} (${Math.floor(ms / 1000)} saniye)`,
                color: 'blue'
            }).start();
            
            const interval = setInterval(() => {
                ms -= 1000;
                if (ms <= 0) {
                    clearInterval(interval);
                    spinner.succeed('Bekleme tamamlandı!');
                    resolve();
                } else {
                    spinner.text = `${text} (${Math.floor(ms / 1000)} saniye)`;
                }
            }, 1000);
        });
    }

    // Cüzdan bakiyelerini göster
    async showBalances() {
        console.log(colors.yellow('\n📊 Cüzdan Bakiyeleri Kontrol Ediliyor...'));
        
        try {
            // İlk modülü geçici olarak kullan - tüm modüllerde displayWalletBalances fonksiyonu olduğunu varsayalım
            const moduleKeys = Object.keys(this.modules);
            if (moduleKeys.length === 0) {
                console.log(colors.red('❌ Hiç modül bulunamadı!'));
                return;
            }
            
            const tempModule = new this.modules[moduleKeys[0]].module(this.privateKeys);
            await tempModule.displayWalletBalances();
        } catch (error) {
            console.error(colors.red(`❌ Bakiyeler gösterilirken hata oluştu: ${error.message}`));
        }
    }

    // İstatistikleri göster
    async showStats() {
        console.log(colors.yellow('\n📊 İstatistikler:'));
        console.log(colors.cyan('▓'.repeat(50)));
        
        console.log(colors.green(`📌 Toplam Cüzdan Sayısı: ${this.privateKeys.length}`));
        console.log(colors.green(`📌 Seçilen Modül Sayısı: ${this.settings.selectedModules.length}`));
        
        if (this.settings.selectedModules.length > 0) {
            console.log(colors.green(`📌 Seçilen Modüller:`));
            this.settings.selectedModules.forEach(moduleKey => {
                console.log(colors.yellow(`   - ${this.modules[moduleKey].name}`));
            });
        }
        
        console.log(colors.green(`📌 Döngü Modu: ${this.settings.infiniteLoop ? 'Sonsuz ♾️' : `Sabit (${this.settings.loopCount} döngü)`}`));
        console.log(colors.green(`📌 Günlük TX/Cüzdan: ${this.settings.dailyTxPerWallet}`));
        
        console.log(colors.cyan('▓'.repeat(50)));
    }
}

// Ana programı başlat
async function main() {
    try {
        const controller = new MegaEthFarmingController();
        await controller.start();
    } catch (error) {
        console.error(colors.red(`🚨 Program hatası: ${error.message}`));
    }
}

main().catch(console.error);
