enum HttpMethod {
    GET,
    POST,
    PUT,
    HEAD,
    DELETE,
    PATCH,
    OPTIONS,
    CONNECT,
    TRACE
}

enum Newline {
    CRLF,
    LF,
    CR
}


/**
 * IoT_Kid commands.
 */
//% color=#3452C3 weight=90 icon="\uf1eb" block="IoT_kid:bit"
namespace IoTkid {

    function writeToSerial(data: string, waitTime: number = 100 ): void {
        serial.writeString(data + "\u000D" + "\u000A")
        if (waitTime > 0) {
            basic.pause(waitTime)
        }
    }
    let wifi_connected: boolean = false
    let pauseBaseValue: number = 10
    let thingspeak_connected: boolean = false
    let last_upload_successful: boolean = false

    /**
     * Change HTTP method wait period.
     * @param newPauseBaseValue Base value, eg: 1000
     */
    //% weight=1
    export function changeHttpMethodWaitPeriod(newPauseBaseValue: number): void {
        pauseBaseValue = newPauseBaseValue
    }
    // wait for certain response from ESP8266
    function waitResponse(): boolean {
        let serial_str: string = ""
        let result: boolean = false
        let time: number = input.runningTime()
        while (true) {
            serial_str += serial.readString()
            if (serial_str.length > 200) serial_str = serial_str.substr(serial_str.length - 200)
            if (serial_str.includes("OK") || serial_str.includes("ALREADY CONNECTED")) {
                result = true
                break
            } else if (serial_str.includes("ERROR") || serial_str.includes("SEND FAIL")) {
                break
            }
            if (input.runningTime() - time > 10000) break
        }
        return result
    }


    /**
    * Initialize ESP8266 module and connect it to Wifi router
    */
    //% weight=100
    //% block="Connect to Wifi|RX (Tx of micro:bit) %tx|TX (Rx of micro:bit) %rx|Baud rate %baudrate|Wifi SSID = %ssid|Wifi PW = %pw"
    //% tx.defl=SerialPin.P0
    //% rx.defl=SerialPin.P1
    //% ssid.defl=your_ssid
    //% pw.defl=your_pw
    export function connectToWiFiBit(tx: SerialPin, rx: SerialPin, baudrate: BaudRate, ssid: string, key: string): void {
        wifi_connected = false
        serial.redirect(
            tx,
            rx,
            baudrate
        )
        // Restart module:
        writeToSerial("AT+RST", 100)
        // WIFI mode = Station mode (client):
        writeToSerial("AT+CWMODE=1", 1000)
        // Reset:
        writeToSerial("AT+RST", 100)
        // Connect to AP:
        writeToSerial("AT+CWJAP=\"" + ssid + "\",\"" + key + "\"", 1000)
        wifi_connected =  waitResponse()
        basic.pause(100)

    }

    /**
    * Check if ESP8266 successfully connected to Wifi
    */
   //% weight=99
    //% block="Wifi connected with router?"
    export function isWifiConnected() {
        return wifi_connected
    }

    /**
     * Disconnect from WiFi network.
     */
    //% weight=98
    //% blockId="wfb_wifi_off" block="disconnect from WiFi network"
    export function disconnectFromWiFiNetwork(): void {
        // Disconnect from AP:
        writeToSerial("AT+CWQAP", 6000)
    }

    /**
     * Execute AT command.
     * @param command AT command, eg: "AT"
     * @param waitTime Wait time after execution, eg: 1000
     */
    //% weight=97
    //% blockId="wfb_at" block="execute AT command %command and then wait %waitTime ms"
    export function executeAtCommand(command: string, waitTime: number): void {
        writeToSerial(command, waitTime)
    }

        /**
    * Connect to ThingSpeak and upload data. It would not upload anything if it failed to connect to Wifi or ThingSpeak.
    */
    //% weight=96
    //% block="Upload data to ThingSpeak|URL/IP = %ip|Write API key = %write_api_key|Field 1 = %n1|Field 2 = %n2|Field 3 = %n3|Field 4 = %n4|Field 5 = %n5|Field 6 = %n6|Field 7 = %n7|Field 8 = %n8"
    //% ip.defl=api.thingspeak.com
    //% write_api_key.defl=your_write_api_key
    export function connectThingSpeak(ip: string, write_api_key: string, n1: number, n2: number, n3: number, n4: number, n5: number, n6: number, n7: number, n8: number) {
        if (wifi_connected && write_api_key != "") {
            thingspeak_connected = false
            writeToSerial("AT+CIPSTART=\"TCP\",\"" + ip + "\",80", 0) // connect to website server
            thingspeak_connected = waitResponse()
            basic.pause(100)
            if (thingspeak_connected) {
                last_upload_successful = false
                let str: string = "GET /update?api_key=" + write_api_key + "&field1=" + n1 + "&field2=" + n2 + "&field3=" + n3 + "&field4=" + n4 + "&field5=" + n5 + "&field6=" + n6 + "&field7=" + n7 + "&field8=" + n8
                writeToSerial("AT+CIPSEND=" + (str.length + 2))
                writeToSerial(str, 0) // upload data
                last_upload_successful = waitResponse()
                basic.pause(100)
            }
        }
    }
        /**
    * Check if ESP8266 successfully connected to ThingSpeak
    */
    //% block="ThingSpeak connected ?"
    export function isThingSpeakConnected() {
        return thingspeak_connected
    }

    /**
    * Check if ESP8266 successfully uploaded data to ThingSpeak
    */
    //% block="Last data upload successful ?"
    export function isLastUploadSuccessful() {
        return last_upload_successful
    }
    /**
     * Execute HTTP method.
     * @param method HTTP method, eg: HttpMethod.GET
     * @param host Host, eg: "google.com"
     * @param port Port, eg: 80
     * @param urlPath Path, eg: "/search?q=something"
     * @param headers Headers
     * @param body Body
     */
    //% weight=94
    //% blockId="wfb_http" block="execute HTTP method %method|host: %host|port: %port|path: %urlPath||headers: %headers|body: %body"
    export function executeHttpMethod(method: HttpMethod, host: string, port: number, urlPath: string, headers?: string, body?: string): void {
        let myMethod: string
        switch (method) {
            case HttpMethod.GET: myMethod = "GET"; break;
            case HttpMethod.POST: myMethod = "POST"; break;
            case HttpMethod.PUT: myMethod = "PUT"; break;
            case HttpMethod.HEAD: myMethod = "HEAD"; break;
            case HttpMethod.DELETE: myMethod = "DELETE"; break;
            case HttpMethod.PATCH: myMethod = "PATCH"; break;
            case HttpMethod.OPTIONS: myMethod = "OPTIONS"; break;
            case HttpMethod.CONNECT: myMethod = "CONNECT"; break;
            case HttpMethod.TRACE: myMethod = "TRACE";
        }
        // Establish TCP connection:
        let data: string = "AT+CIPSTART=\"TCP\",\"" + host + "\"," + port
        writeToSerial(data, pauseBaseValue * 6)
        data = myMethod + " " + urlPath + " HTTP/1.1" + "\u000D" + "\u000A"
            + "Host: " + host + "\u000D" + "\u000A"
        if (headers && headers.length > 0) {
            data += headers + "\u000D" + "\u000A"
        }
        if (data && data.length > 0) {
            data += "\u000D" + "\u000A" + body + "\u000D" + "\u000A"
        }
        data += "\u000D" + "\u000A"
        // Send data:
        writeToSerial("AT+CIPSEND=" + (data.length + 2), pauseBaseValue * 3)
        writeToSerial(data, pauseBaseValue * 6)
        // Close TCP connection:
        writeToSerial("AT+CIPCLOSE", pauseBaseValue * 3)
    }

    /**
     * Write Blynk pin value.
     * @param value Value, eg: "510"
     * @param pin Pin, eg: "A0"
     * @param auth_token Token, eg: "14dabda3551b4dd5ab46464af582f7d2"
     */
    //% weight=93
    //% blockId="wfb_blynk_write" block="Blynk: write %value to %pin, token is %auth_token"
    export function writePinValue(value: string, pin: string, auth_token: string): void {
        executeHttpMethod(
            HttpMethod.GET,
            "blynk-cloud.com",
            80,
            "/" + auth_token + "/update/" + pin + "?value=" + value
        )
    }

    /**
     * Read Blynk pin value.
     * @param pin Pin, eg: "A0"
     * @param auth_token Token, eg: "14dabda3551b4dd5ab46464af582f7d2"
     */
    //% weight=92
    //% blockId="wfb_blynk_read" block="Blynk: read %pin, token is %auth_token"
    export function readPinValue(pin: string, auth_token: string): string {
        executeAtCommand("ATE0", 1000)
        let response: string
        serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
            response += serial.readString()
        })
        executeHttpMethod(
            HttpMethod.GET,
            "blynk-cloud.com",
            80,
            "/" + auth_token + "/get/" + pin
        )
        let value: string = response.substr(response.indexOf("[") + 2, response.indexOf("]") - response.indexOf("[") - 3)
        response = null
        serial.onDataReceived(serial.delimiters(Delimiters.NewLine), () => { })
        return value
    }

    /**
     * Line separator. It's used when headers or body are multiline.
     */
    //% weight=91
    //% blockId="wfb_crlf" block="CRLF"
    export function newline(): string {
        return "\u000D" + "\u000A"
    }

}
