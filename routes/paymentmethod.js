const express = require('express');
const router = express.Router();
const { getPaymentMethods, getPaymentMethod, addPaymentMethod, updatePaymentMethod, deletePaymentMethod } = require('../controllers/paymentmethods');

const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Payment Methods
 *   description: API for managing user payment methods
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentMethod:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the payment method
 *           example: "507f1f77bcf86cd799439011"
 *         user:
 *           type: string
 *           description: The ID of the user who owns this payment method
 *           example: "507f191e810c19729de860ea"
 *         name:
 *           type: string
 *           description: Name for the payment method
 *           example: "My Personal Credit Card"
 *         method:
 *           type: string
 *           enum: [credit_card, bank_account]
 *           description: Type of payment method
 *           example: "credit_card"
 *         bankName:
 *           type: string
 *           enum: [KBank, SCB, BBL, Krungsri, KTB, TTB, BAAC, GSB, CIMB, UOB]
 *           description: Name of the bank (required for bank_account method)
 *           example: "KBank"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date when the payment method was created
 *           example: "2023-05-20T08:30:00Z"
 *       required:
 *         - user
 *         - name
 *         - method
 */

/**
 * @swagger
 * /api/payment-methods:
 *   get:
 *     summary: Get all payment methods of the authenticated user
 *     tags: [Payment Methods]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PaymentMethod'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 *   post:
 *     summary: Add a new payment method
 *     tags: [Payment Methods]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "My Credit Card"
 *               method:
 *                 type: string
 *                 enum: [credit_card, bank_account]
 *                 example: "credit_card"
 *               cardNumber:
 *                 type: string
 *                 description: Required if method is credit_card (13-19 digits)
 *                 example: "4111111111111111"
 *               bankAccountNumber:
 *                 type: string
 *                 description: Required if method is bank_account (10-12 digits)
 *                 example: "1234567890"
 *               bankName:
 *                 type: string
 *                 enum: [KBank, SCB, BBL, Krungsri, KTB, TTB, BAAC, GSB, CIMB, UOB]
 *                 description: Required if method is bank_account
 *                 example: "KBank"
 *               label:
 *                 type: string
 *                 description: Optional label for the payment method
 *                 example: "Primary Card"
 *             required:
 *               - name
 *               - method
 *     responses:
 *       201:
 *         description: Payment method created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PaymentMethod'
 *       400:
 *         description: Bad request (invalid data or payment method already exists)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/payment-methods/{id}:
 *   get:
 *     summary: Get a specific payment method by ID
 *     tags: [Payment Methods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Payment method ID
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PaymentMethod'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment method not found
 *       500:
 *         description: Server error
 *
 *   put:
 *     summary: Update a payment method
 *     tags: [Payment Methods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Payment method ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Card Name"
 *               method:
 *                 type: string
 *                 enum: [credit_card, bank_account]
 *                 example: "credit_card"
 *               cardNumber:
 *                 type: string
 *                 example: "4111111111111111"
 *               bankAccountNumber:
 *                 type: string
 *                 example: "1234567890"
 *               bankName:
 *                 type: string
 *                 enum: [KBank, SCB, BBL, Krungsri, KTB, TTB, BAAC, GSB, CIMB, UOB]
 *                 example: "KBank"
 *     responses:
 *       200:
 *         description: Payment method updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PaymentMethod'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment method not found
 *       500:
 *         description: Server error
 *
 *   delete:
 *     summary: Delete a payment method
 *     tags: [Payment Methods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Payment method ID
 *     responses:
 *       200:
 *         description: Payment method deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   example: {}
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment method not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

router.route('/').get(protect, authorize('admin', 'user'), getPaymentMethods).post(protect, authorize('admin', 'user'), addPaymentMethod);
router.route('/:id').get(protect, authorize('admin', 'user'), getPaymentMethod).put(protect, authorize('admin', 'user'), updatePaymentMethod).delete(protect, authorize('admin', 'user'), deletePaymentMethod);

module.exports = router;