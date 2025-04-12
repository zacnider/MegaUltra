require('dotenv').config();
const ethers = require('ethers');
const colors = require('colors');

class RaribleFunMinter {
    constructor(privateKeys) {
        // RPC ve Provider Ayarları
        this.rpcUrl = process.env.RPC_URL || "https://carrot.megaeth.com/rpc";
        this.provider = new ethers.providers.JsonRpcProvider(this.rpcUrl);
        
        // Cüzdanları oluştur
        this.accounts = privateKeys.map(pk => new ethers.Wallet(pk, this.provider));
        
        // Fun Starts Here NFT Kontrat Adresi
        this.funNftAddress = "0xb8027Dca96746f073896C45f65B720F9Bd2afee7";
        
        // Mint işlemi için ABI
        this.funNftABI = [
            "function mint() external returns (uint256)",
            "function balanceOf(address owner) view returns (uint256)",
            "function name() view returns (string)",
            "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
            "function ownerOf(uint256 tokenId) view returns (address)"
        ];
        
        // Kontrat hazırlığı
        this.funNftContracts = {};
        
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
                this.funNftContracts[wallet.address] = new ethers.Contract(
                    this.funNftAddress,
                    this.funNftABI,
                    wallet
                );
            } catch (error) {
                console.error(colors.red(`Fun NFT kontratı oluşturma hatası: ${error.message}`));
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
    
    // NFT bakiye bilgilerini alma
    async getNftBalance(wallet) {
        try {
            const contract = this.funNftContracts[wallet.address];
            const balance = await contract.balanceOf(wallet.address);
            const name = await contract.name();
            
            // Cüzdandaki NFT token ID'lerini al
            const tokenIds = [];
            for (let i = 0; i < balance.toNumber(); i++) {
                try {
                    const tokenId = await contract.tokenOfOwnerByIndex(wallet.address, i);
                    tokenIds.push(tokenId.toString());
                } catch (err) {
                    // Token ID alınamadıysa devam et
                }
            }
            
            return {
                balance: balance.toNumber(),
                name: name,
                tokenIds: tokenIds
            };
        } catch (error) {
            console.error(colors.red(`NFT bakiye hatası: ${error.message}`));
            return {
                balance: 0,
                name: "Fun Starts Here",
                tokenIds: []
            };
        }
    }
    
    // Cüzdan bakiyelerini görüntüleme
    async displayWalletBalances() {
        for (const wallet of this.accounts) {
            console.log(colors.blue(`📊 Cüzdan Adresi: ${wallet.address}`));
            
            // Native token bakiyesi (ETH)
            const nativeBalance = await wallet.getBalance();
            console.log(colors.green(`   Native Token Bakiyesi: ${ethers.utils.formatEther(nativeBalance)} ETH`));
            
            // Fun NFT Bakiyesi
            try {
                const nftInfo = await this.getNftBalance(wallet);
                console.log(colors.yellow(`   ${nftInfo.name} NFT Bakiyesi: ${nftInfo.balance} adet`));
                
                if (nftInfo.tokenIds.length > 0) {
                    console.log(colors.cyan(`   NFT Token ID'leri: ${nftInfo.tokenIds.join(', ')}`));
                }
            } catch (error) {
                console.error(colors.red(`   NFT bakiyesi alınamadı: ${error.message}`));
            }
            
            console.log('-------------------');
        }
    }
    
    // Mint işlemi gerçekleştirme
    async performSwap() {
        console.log(colors.yellow('🔍 Rarible.fun - "Fun Starts Here" NFT Mint İşlemi Başlatılıyor...'));
        
        // ChainID kontrolü
        const networkInfo = await this.provider.getNetwork();
        console.log(colors.cyan(`🌐 Bağlanılan Ağ: Chain ID ${networkInfo.chainId}`));
        
        try {
            for (const wallet of this.accounts) {
                try {
                    console.log(colors.blue(`🔒 İşlem Yapılan Cüzdan: ${wallet.address}`));
                    
                    // İşlem öncesi bakiye
                    const beforeBalance = await this.getNftBalance(wallet);
                    console.log(colors.yellow(`ℹ️ İşlem Öncesi NFT Bakiyesi: ${beforeBalance.balance} adet ${beforeBalance.name}`));
                    
                    try {
                        // Mint data'sı manuel olarak oluşturma
                        const mintData = "0x1249c58b"; // mint fonksiyon seçici (selector)
                        
                        // Mint işlemini gerçekleştir (manuel transaction)
                        const tx = await wallet.sendTransaction({
                            to: this.funNftAddress,
                            data: mintData,
                            value: ethers.utils.parseEther("0"), // 0 ETH
                            gasLimit: ethers.utils.hexlify(300000)
                        });
                        
                        console.log(colors.cyan(`🔄 Mint İşlemi Gönderildi - TX Hash: ${tx.hash}`));
                        
                        const receipt = await tx.wait();
                        console.log(colors.green(`✅ Mint İşlemi Tamamlandı`));
                        this.showTransactionLink(receipt.transactionHash);
                        
                        // İşlem sonrası bakiye kontrolü
                        await this.waitWithProgress(5000); // Bakiye güncellemesi için kısa bir bekleme
                        
                        const afterBalance = await this.getNftBalance(wallet);
                        console.log(colors.yellow(`ℹ️ İşlem Sonrası NFT Bakiyesi: ${afterBalance.balance} adet ${afterBalance.name}`));
                        
                        // Bakiye değişimi
                        const balanceDiff = afterBalance.balance - beforeBalance.balance;
                        if (balanceDiff > 0) {
                            console.log(colors.green(`📈 Mint Edilen NFT Sayısı: ${balanceDiff} adet`));
                            
                            // Yeni token ID'leri
                            const newTokenIds = afterBalance.tokenIds.filter(id => !beforeBalance.tokenIds.includes(id));
                            if (newTokenIds.length > 0) {
                                console.log(colors.cyan(`🆕 Yeni NFT Token ID'leri: ${newTokenIds.join(', ')}`));
                            }
                        } else {
                            console.log(colors.yellow(`⚠️ Bakiye değişimi tespit edilemedi veya işlem başarısız oldu.`));
                        }
                        
                    } catch (error) {
                        console.error(colors.red(`❌ Mint İşlemi Hatası: ${error.message}`));
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
            console.error(colors.red(`🚨 Ana Mint Hatası: ${mainError.message}`));
        }
    }
}

// Modülü dışa aktar
module.exports = { RaribleFunMinter };
