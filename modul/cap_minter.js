require('dotenv').config();
const ethers = require('ethers');
const colors = require('colors');

class CapMinter {
    constructor(privateKeys) {
        // RPC ve Provider Ayarları
        this.rpcUrl = process.env.RPC_URL || "https://carrot.megaeth.com/rpc";
        this.provider = new ethers.providers.JsonRpcProvider(this.rpcUrl);
        
        // Cüzdanları oluştur
        this.accounts = privateKeys.map(pk => new ethers.Wallet(pk, this.provider));
        
        // cUSD Token Adresi
        this.cUSDAddress = "0xE9b6e75C243B6100ffcb1c66e8f78F96FeeA727F";
        
        // Mint işlemi için ABI
        this.cUSDMintABI = [
            "function mint(address to, uint256 amount) returns (bool)",
            "function balanceOf(address owner) view returns (uint256)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)"
        ];
        
        // Kontrat hazırlığı
        this.cUSDContracts = {};
        
        // Kontratları başlat
        this.initializeContracts();
    }
    
    // Güvenli adres normalizasyonu
    safeNormalizeAddress(address) {
        try {
            address = address.toLowerCase();
            return ethers.utils.getAddress(address);
        } catch (error) {
            console.error(colors.red(`Adres normalize edilemedi: ${address}`));
            return address;
        }
    }
    
    // Kontratları başlatma metodu
    initializeContracts() {
        for (const wallet of this.accounts) {
            try {
                this.cUSDContracts[wallet.address] = new ethers.Contract(
                    this.cUSDAddress,
                    this.cUSDMintABI,
                    wallet
                );
            } catch (error) {
                console.error(colors.red(`cUSD kontratı oluşturma hatası: ${error.message}`));
            }
        }
    }
    
    // Bekleme fonksiyonu
    async waitWithProgress(ms) {
        const startTime = Date.now();
        const endTime = startTime + ms;
        
        while (Date.now() < endTime) {
            const remainingTime = Math.ceil((endTime - Date.now()) / 1000);
            process.stdout.write(`\r⏳ Kalan bekleme süresi: ${remainingTime} saniye`.yellow);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\n');
    }
    
    // İşlem linkini gösterme
    showTransactionLink(txHash) {
        console.log(colors.green(`🔗 İşlem Linki: https://www.megaexplorer.xyz/tx/${txHash}`));
    }
    
    // Token bakiyesi alma
    async getTokenBalance(wallet) {
        try {
            const contract = this.cUSDContracts[wallet.address];
            const balance = await contract.balanceOf(wallet.address);
            const decimals = await contract.decimals();
            const symbol = await contract.symbol();
            
            return {
                balance: balance,
                formattedBalance: ethers.utils.formatUnits(balance, decimals),
                symbol: symbol
            };
        } catch (error) {
            console.error(colors.red(`Token bakiye hatası: ${error.message}`));
            return {
                balance: ethers.BigNumber.from(0),
                formattedBalance: "0",
                symbol: "cUSD"
            };
        }
    }
    
    // Cüzdan bakiyelerini görüntüleme
    async displayWalletBalances() {
        for (const wallet of this.accounts) {
            console.log(colors.blue(`📊 Cüzdan Adresi: ${wallet.address}`));
            
            // Native token bakiyesi (ETH, CELO vs.)
            const nativeBalance = await wallet.getBalance();
            console.log(colors.green(`   Native Token Bakiyesi: ${ethers.utils.formatEther(nativeBalance)} ETH`));
            
            // cUSD Bakiyesi
            try {
                const tokenInfo = await this.getTokenBalance(wallet);
                console.log(colors.yellow(`   cUSD Bakiyesi: ${tokenInfo.formattedBalance} ${tokenInfo.symbol}`));
            } catch (error) {
                console.error(colors.red(`   cUSD bakiyesi alınamadı: ${error.message}`));
            }
            
            console.log('-------------------');
        }
    }
    
    // Mint işlemi gerçekleştirme
    async performSwap() {
        console.log(colors.yellow('🔍 Cap cUSD Mint İşlemi Başlatılıyor...'));
        
        // ChainID kontrolü
        const networkInfo = await this.provider.getNetwork();
        console.log(colors.cyan(`🌐 Bağlanılan Ağ: Chain ID ${networkInfo.chainId}`));
        
        // Bu bölümü yorum satırına alıyorum çünkü aynı ağı kullanıyoruz
        // // Beklenen Chain ID
        // const expectedChainId = 6342;
        // if (networkInfo.chainId !== expectedChainId) {
        //     console.error(colors.red(`❌ Uyumsuz Chain ID! Beklenen: ${expectedChainId}, Alınan: ${networkInfo.chainId}`));
        //     console.log(colors.yellow(`ℹ️ Lütfen .env dosyasında doğru RPC_URL ayarladığınızdan emin olun.`));
        //     return;
        // }
        
        try {
            for (const wallet of this.accounts) {
                try {
                    console.log(colors.blue(`🔒 İşlem Yapılan Cüzdan: ${wallet.address}`));
                    
                    // İşlem öncesi bakiye
                    const beforeBalance = await this.getTokenBalance(wallet);
                    console.log(colors.yellow(`ℹ️ İşlem Öncesi cUSD Bakiyesi: ${beforeBalance.formattedBalance} ${beforeBalance.symbol}`));
                    
                     // Mint işlem miktarı (sabit 1000 cUSD)
                    const mintAmount = ethers.utils.parseEther("1000");
                    console.log(colors.magenta(`💱 Mint Edilecek Miktar: 1000 cUSD (Sabit)`));

                    
                    try {
                        // Mint data'sı manuel olarak oluşturma
                        const mintData = "0x40c10f19" + // mint fonksiyon seçici (selector)
                                         wallet.address.slice(2).padStart(64, '0') + // adres parametresi
                                         mintAmount.toHexString().slice(2).padStart(64, '0'); // miktar parametresi
                        
                        // Mint işlemini gerçekleştir (manuel transaction)
                        const tx = await wallet.sendTransaction({
                            to: this.cUSDAddress,
                            data: mintData,
                            gasLimit: ethers.utils.hexlify(300000)
                        });
                        
                        console.log(colors.cyan(`🔄 Mint İşlemi Gönderildi - TX Hash: ${tx.hash}`));
                        
                        const receipt = await tx.wait();
                        console.log(colors.green(`✅ Mint İşlemi Tamamlandı`));
                        this.showTransactionLink(receipt.transactionHash);
                        
                        // İşlem sonrası bakiye kontrolü
                        await this.waitWithProgress(5000); // Bakiye güncellemesi için kısa bir bekleme
                        
                        const afterBalance = await this.getTokenBalance(wallet);
                        console.log(colors.yellow(`ℹ️ İşlem Sonrası cUSD Bakiyesi: ${afterBalance.formattedBalance} ${afterBalance.symbol}`));
                        
                        // Bakiye değişimi
                        const balanceDiff = afterBalance.balance.sub(beforeBalance.balance);
                        console.log(colors.green(`📈 Kazanılan cUSD: ${ethers.utils.formatEther(balanceDiff)} ${afterBalance.symbol}`));
                        
                    } catch (error) {
                        console.error(colors.red(`❌ Mint İşlemi Hatası: ${error.message}`));
                    }
                    
                    // İşlemler arasında bekle (15-30 saniye)
                    const waitTime = Math.floor(Math.random() * 15000) + 15000;
                    await this.waitWithProgress(waitTime);
                    
                } catch (walletError) {
                    console.error(colors.red(`🚨 Cüzdan İşlem Hatası: ${walletError.message}`));
                }
            }
            
            // Son olarak bakiyeleri göster
            await this.displayWalletBalances();
            
        } catch (mainError) {
            console.error(colors.red(`🚨 Ana Mint Hatası: ${mainError.message}`));
        }
    }
}

// Modülü dışa aktar
module.exports = { CapMinter };
