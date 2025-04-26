# 1. ใช้ Node.js เวอร์ชัน 20 เป็น base
FROM node:20

# 2. ตั้งโฟลเดอร์ทำงานใน container เป็น /app
WORKDIR /app

# 3. คัดลอกไฟล์ package.json และ package-lock.json เข้าไป
COPY package*.json ./

# 4. ติดตั้ง dependencies
RUN npm install

# 5. คัดลอกไฟล์โค้ดทั้งหมดเข้าไปใน container
COPY . .

# 6. คำสั่งที่ให้ container ทำเมื่อเริ่มต้น
# รัน npm test ซึ่งจะ:
#  - รันทดสอบ
#  - สร้างไฟล์ HTML report ออกมา
CMD ["npm", "test--coverage"]
