require('dotenv').config();
const ethers = require('ethers');
const colors = require('colors');

class OnchainGM {
    constructor(privateKeys) {
        // RPC ve Provider Ayarları
        this.rpcUrl = process.env.RPC_URL || "https://carrot.megaeth.com/rpc";
        this.provider = new ethers.providers.JsonRpcProvider(this.rpcUrl);
        
        // Cüzdanları oluştur
        this.accounts = privateKeys.map(pk => new ethers.Wallet(pk, this.provider));
        
        // OnchainGM Kontrat Adresi
        this.gmContractAddress = "0x178f55FaA0845Ae2e6348d53B9Ff3E869916b939";
        
        // İşlem Ayarları
        this.txValue = ethers.utils.parseEther("0.000010"); // 0.000010 ETH
        this.gasLimit = 200000; // 200,000 gas limit
        this.gasPrice = ethers.utils.parseUnits("0.0020", "gwei"); // 0.0020 Gwei
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
    
    // Cüzdan bakiyelerini görüntüleme
    async displayWalletBalances() {
        for (const wallet of this.accounts) {
            console.log(colors.blue(`📊 Cüzdan Adresi: ${wallet.address}`));
            
            // Native token bakiyesi (ETH)
            const nativeBalance = await wallet.getBalance();
            console.log(colors.green(`   Native Token Bakiyesi: ${ethers.utils.formatEther(nativeBalance)} ETH`));
            
            console.log('-------------------');
        }
    }
    
    // OnchainGM işlemi gerçekleştirme
    async performSwap() {
        console.log(colors.yellow('🔍 OnchainGM İşlemi Başlatılıyor...'));
        
        // ChainID kontrolü
        const networkInfo = await this.provider.getNetwork();
        console.log(colors.cyan(`🌐 Bağlanılan Ağ: Chain ID ${networkInfo.chainId}`));
        
        try {
            for (const wallet of this.accounts) {
                try {
                    console.log(colors.blue(`🔒 İşlem Yapılan Cüzdan: ${wallet.address}`));
                    
                    // İşlem öncesi bakiye
                    const beforeBalance = await wallet.getBalance();
                    console.log(colors.yellow(`ℹ️ İşlem Öncesi ETH Bakiyesi: ${ethers.utils.formatEther(beforeBalance)} ETH`));
                    
                    try {
                        // OnchainGM verisi
                        const gmData = "0x5011b71c"; // GM fonksiyon seçici (selector)
                        
                        // ETH değeri ve Gas
                        const value = this.txValue;
                        console.log(colors.magenta(`💲 Gönderilecek ETH: ${ethers.utils.formatEther(value)} ETH`));
                        console.log(colors.cyan(`⛽ Gas Limit: ${this.gasLimit}, Gas Fiyatı: ${ethers.utils.formatUnits(this.gasPrice, "gwei")} Gwei`));
                        
                        // İşlemi gerçekleştir
                        const tx = await wallet.sendTransaction({
                            to: this.gmContractAddress,
                            data: gmData,
                            value: value,
                            gasLimit: ethers.utils.hexlify(this.gasLimit),
                            gasPrice: this.gasPrice
                        });
                        
                        console.log(colors.cyan(`🔄 OnchainGM İşlemi Gönderildi - TX Hash: ${tx.hash}`));
                        
                        const receipt = await tx.wait();
                        console.log(colors.green(`✅ OnchainGM İşlemi Tamamlandı`));
                        this.showTransactionLink(receipt.transactionHash);
                        
                        // İşlem sonrası bakiye kontrolü
                        await this.waitWithProgress(5000); // Bakiye güncellemesi için kısa bir bekleme
                        
                        const afterBalance = await wallet.getBalance();
                        console.log(colors.yellow(`ℹ️ İşlem Sonrası ETH Bakiyesi: ${ethers.utils.formatEther(afterBalance)} ETH`));
                        
                        // Bakiye değişimi
                        const balanceDiff = beforeBalance.sub(afterBalance);
                        console.log(colors.cyan(`📉 Harcanan Toplam ETH (işlem ücreti dahil): ${ethers.utils.formatEther(balanceDiff)} ETH`));
                        
                    } catch (error) {
                        console.error(colors.red(`❌ OnchainGM İşlemi Hatası: ${error.message}`));
                    }
                    
                    // İşlemler arasında bekle (30-60 saniye)
                    const waitTime = Math.floor(Math.random() * 30000) + 30000;
                    await this.waitWithProgress(waitTime);
                    
                } catch (walletError) {
                    console.error(colors.red(`🚨 Cüzdan İşlem Hatası: ${walletError.message}`));
                }
            }
            
            // Son olarak bakiyeleri göster
            await this.displayWalletBalances();
            
        } catch (mainError) {
            console.error(colors.red(`🚨 Ana İşlem Hatası: ${mainError.message}`));
        }
    }
}

// Modülü dışa aktar
module.exports = { OnchainGM };
