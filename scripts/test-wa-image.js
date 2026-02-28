require('dotenv').config();
const { WhatsAppServiceFactory } = require('./dist/services/messaging/WhatsAppServiceFactory');

async function testWA() {
    const service = WhatsAppServiceFactory.create();
    // Using user system OR wait for connection
    await service.initialize();

    setTimeout(async () => {
        console.log("Is Ready?", service.isReady());
        if (service.isReady()) {
            try {
                await service.sock.sendMessage("5511999999999@s.whatsapp.net", {
                    image: { url: "https://cf.shopee.com.br/file/br-11134207-7r98o-lsth0c9m9nxg00" },
                    caption: "Test message with image"
                });
                console.log("Sent.");
            } catch (e) {
                console.error("Error sending image:", e);
            }
        }
        process.exit(0);
    }, 5000);
}

testWA();
