require('dotenv').config();
const ethers = require('ethers');
const colors = require('colors');

class GTESwapper {
    constructor(privateKeys) {
        // RPC ve Provider Ayarları
        this.rpcUrl = process.env.RPC_URL || "https://carrot.megaeth.com/rpc";
        this.provider = new ethers.providers.JsonRpcProvider(this.rpcUrl);
        
        // Cüzdanları oluştur
        this.accounts = privateKeys.map(pk => new ethers.Wallet(pk, this.provider));

        // Token Listesi (Checksum formatında)
        this.tokens = {
            "MegaETH": {"address": this.safeNormalizeAddress("0x10A6Be7D23989D00D528E68Cf8051D095F741145"), "decimals": 18},
            "WETH": {"address": this.safeNormalizeAddress("0x776401B9BC8aAe31A685731B7147D4445fD9FB19"), "decimals": 18},
            "GTE": {"address": this.safeNormalizeAddress("0x9629684Df53Db9E4484697D0a50C442B2BFa80A8"), "decimals": 18},
            "USDC": {"address": this.safeNormalizeAddress("0x8D635C4702bA38B1f1735E8e784C7265dcc0B623"), "decimals": 6},
            "tkUSDC": {"address": this.safeNormalizeAddress("0xFAf334E157175Ff676911AdcF0964D7f54F2C424"), "decimals": 6},
            "Kimchi": {"address": this.safeNormalizeAddress("0xA626F15D10F2b30AF1fb0d017F20a579500B5029"), "decimals": 18},
            "five": {"address": this.safeNormalizeAddress("0xF512886BC6877B0740E8Ca0B3c12bb4cA602B530"), "decimals": 18},
            "gtepepe": {"address": this.safeNormalizeAddress("0xBBA08CF5ECE0cC21e1DEB5168746c001B123A756"), "decimals": 18},
            "Enzo": {"address": this.safeNormalizeAddress("0x9Cd3A7B840464D83bEe643Bc9064D246375B07A3"), "decimals": 18},
            "Nasdaq": {"address": this.safeNormalizeAddress("0xD0Ed4c2Af51Bb08c58A808B9B407508261A87F25"), "decimals": 18},
            "Toast": {"address": this.safeNormalizeAddress("0xc49Ae2A62E7c18B7DDcaB67617A63Bf5182B08de"), "decimals": 18}
        };

        // Router Ayarları
        this.routerAddress = this.safeNormalizeAddress("0xa6B579684E943F7D00D616A48Cf99B5147Fc57A5");
        this.routerABI = [
            "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
            "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
            "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)"
        ];

        // Kontrat ve Router hazırlığı
        this.tokenContracts = {};
        this.routerContracts = {};

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
            // Router Kontratı
            this.routerContracts[wallet.address] = new ethers.Contract(
                this.routerAddress, 
                this.routerABI, 
                wallet
            );

            // Token Kontratları
            for (const tokenName in this.tokens) {
                const tokenAddress = this.tokens[tokenName].address;
                
                if (!this.tokenContracts[tokenName]) {
                    this.tokenContracts[tokenName] = {};
                }
                
                try {
                    this.tokenContracts[tokenName][wallet.address] = new ethers.Contract(
                        tokenAddress, 
                        [
                            "function balanceOf(address) view returns (uint256)", 
                            "function approve(address spender, uint256 amount) returns (bool)"
                        ], 
                        wallet
                    );
                } catch (error) {
                    console.error(colors.red(`Token kontratı oluşturma hatası (${tokenName}): ${error.message}`));
                }
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

    // Benzer token bilgisi
    async getSimilarTokenInfo() {
        console.log(colors.yellow("🔍 Token bilgisi kontrolü atlandı"));
        return null;
    }

    // Rastgele token seçimi
    async selectRandomTokens(count = 3) {
        const tokenNames = Object.keys(this.tokens);
        return tokenNames
            .sort(() => 0.5 - Math.random())
            .slice(0, count);
    }

    // Token bakiyesi alma
    async getTokenBalance(tokenName, wallet) {
        try {
            if (!this.tokenContracts[tokenName] || !this.tokenContracts[tokenName][wallet.address]) {
                console.error(colors.red(`Token kontratı bulunamadı: ${tokenName}`));
                return ethers.BigNumber.from(0);
            }

            const tokenContract = this.tokenContracts[tokenName][wallet.address];
            const balance = await tokenContract.balanceOf(wallet.address);
            return balance;
        } catch (error) {
            console.error(colors.red(`Token bakiye hatası: ${tokenName} - ${error.message}`));
            return ethers.BigNumber.from(0);
        }
    }

    // Token onaylama
    async approveToken(tokenName, amount, wallet) {
        try {
            if (!this.tokenContracts[tokenName] || !this.tokenContracts[tokenName][wallet.address]) {
                console.error(colors.red(`Token kontratı bulunamadı: ${tokenName}`));
                return false;
            }

            const tokenContract = this.tokenContracts[tokenName][wallet.address];

            try {
                const tx = await tokenContract.approve(this.routerAddress, amount, {
                    gasLimit: ethers.utils.hexlify(100000)
                });
                await tx.wait();
                console.log(colors.green(`✅ Token Onaylandı: ${tokenName}`));
                return true;
            } catch (error) {
                console.error(colors.red(`❌ Token Onay Hatası (${tokenName}): ${error.message}`));
                return false;
            }
        } catch (error) {
            console.error(colors.red(`Token onay hatası: ${error.message}`));
            return false;
        }
    }

    // Cüzdan bakiyelerini görüntüleme
    async displayWalletBalances() {
        for (const wallet of this.accounts) {
            console.log(colors.blue(`📊 Cüzdan Adresi: ${wallet.address}`));
            
            // ETH Bakiyesi
            const ethBalance = await wallet.getBalance();
            console.log(colors.green(`   ETH Bakiyesi: ${ethers.utils.formatEther(ethBalance)} ETH`));

            // Token Bakiyeleri
            for (const tokenName in this.tokens) {
                try {
                    const tokenBalance = await this.getTokenBalance(tokenName, wallet);
                    console.log(colors.yellow(`   ${tokenName} Bakiyesi: ${ethers.utils.formatUnits(tokenBalance, this.tokens[tokenName].decimals)} ${tokenName}`));
                } catch (error) {
                    console.error(colors.red(`Token bakiye hatası: ${tokenName} - ${error.message}`));
                }
            }
            console.log('-------------------');
        }
    }

    // Swap işlemi
    async performSwap() {
        try {
            await this.getSimilarTokenInfo();

            for (const wallet of this.accounts) {
                try {
                    console.log(colors.blue(`🔒 İşlem Yapılan Cüzdan: ${wallet.address}`));

                    const router = this.routerContracts[wallet.address];

                    const selectedTokens = await this.selectRandomTokens();
                    console.log(colors.yellow(`🎲 Seçilen Tokenler: ${selectedTokens.join(', ')}`));

                    // ETH -> Token Swapı
                    for (const tokenName of selectedTokens) {
                        try {
                            const tokenData = this.tokens[tokenName];
                            const ethBalance = await wallet.getBalance();
                            
                            // ETH -> Token işleminde bakiyenin %10-20'si arası
                            const swapPercentage = Math.random() * 0.1 + 0.1; // %10-%20 arası
                            const swapAmount = ethBalance.mul(Math.floor(swapPercentage * 100)).div(100);

                            console.log(colors.magenta(`💱 ETH → ${tokenName} Swap Miktarı: ${ethers.utils.formatEther(swapAmount)} ETH (Bakiyenin %${Math.floor(swapPercentage * 100)}'i)`));

                            // WETH adresini doğrudan kullanalım
                            const wethAddress = this.safeNormalizeAddress("0x776401B9BC8aAe31A685731B7147D4445fD9FB19");
                            const path = [
                                wethAddress, 
                                tokenData.address
                            ];

                            const deadline = Math.floor(Date.now() / 1000) + 300;

                            const tx = await router.swapExactETHForTokens(
                                0,
                                path,
                                wallet.address,
                                deadline,
                                { 
                                    value: swapAmount,
                                    gasLimit: ethers.utils.hexlify(300000)
                                }
                            );

                            const receipt = await tx.wait();
                            console.log(colors.green(`✅ ETH → ${tokenName} Swap Tamamlandı`));
                            this.showTransactionLink(receipt.transactionHash);

                            await this.waitWithProgress(Math.floor(Math.random() * 7000 + 8000));

                        } catch (error) {
                            console.error(colors.red(`❌ ETH → Token Swap Hatası (${tokenName}): ${error.message}`));
                        }
                    }

                    // Token -> ETH Swapı
                    for (const tokenName of selectedTokens) {
                        try {
                            const tokenData = this.tokens[tokenName];
                            const tokenBalance = await this.getTokenBalance(tokenName, wallet);
                            
                            if (tokenBalance.eq(0)) {
                                console.log(colors.yellow(`⚠️ ${tokenName} bakiyesi sıfır, swap atlanıyor.`));
                                continue;
                            }

                            // Token -> ETH işleminde bakiyenin tamamı
                            const swapAmount = tokenBalance;

                            console.log(colors.magenta(`💱 ${tokenName} → ETH Swap Miktarı: ${ethers.utils.formatUnits(swapAmount, tokenData.decimals)} ${tokenName} (Bakiyenin %100'ü)`));

                            const approvalResult = await this.approveToken(tokenName, swapAmount, wallet);
                            if (!approvalResult) {
                                console.error(colors.red(`❌ ${tokenName} token onayı başarısız`));
                                continue;
                            }

                            // WETH adresini doğrudan kullanalım
                            const wethAddress = this.safeNormalizeAddress("0x776401B9BC8aAe31A685731B7147D4445fD9FB19");
                            const path = [
                                tokenData.address,
                                wethAddress
                            ];

                            const deadline = Math.floor(Date.now() / 1000) + 300;

                            const tx = await router.swapExactTokensForETH(
                                swapAmount,
                                0,
                                path,
                                wallet.address,
                                deadline,
                                {
				gasLimit: ethers.utils.hexlify(300000)
                                }
                            );

                            const receipt = await tx.wait();
                            console.log(colors.green(`✅ ${tokenName} → ETH Swap Tamamlandı`));
                            this.showTransactionLink(receipt.transactionHash);

                            await this.waitWithProgress(Math.floor(Math.random() * 7000 + 8000));

                        } catch (error) {
                            console.error(colors.red(`❌ Token → ETH Swap Hatası (${tokenName}): ${error.message}`));
                        }
                    }

                } catch (walletError) {
                    console.error(colors.red(`🚨 Cüzdan İşlem Hatası: ${walletError.message}`));
                }
            }

            // Son olarak bakiyeleri göster
            await this.displayWalletBalances();

        } catch (mainError) {
            console.error(colors.red(`🚨 Ana Swap Hatası: ${mainError.message}`));
        }
    }
}

// Modülü dışa aktar
module.exports = { GTESwapper };
