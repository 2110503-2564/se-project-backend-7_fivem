const express = require("express");
const {
  getTransaction,
  getTransactions,
} = require("../controllers/transaction");

const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const { downloadTransactions } = require('../controllers/transaction');


/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: API for managing transactions
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the transaction
 *           example: "507f1f77bcf86cd799439011"
 *         user:
 *           $ref: '#/components/schemas/User'
 *           description: The user who made the transaction
 *         booking:
 *           $ref: '#/components/schemas/Booking'
 *           description: The associated booking
 *         campground:
 *           $ref: '#/components/schemas/Campground'
 *           description: The campground related to the transaction
 *         paymentMethod:
 *           $ref: '#/components/schemas/PaymentMethod'
 *           description: The payment method used
 *         amount:
 *           type: number
 *           format: float
 *           description: The transaction amount
 *           example: 1500.50
 *         status:
 *           type: string
 *           description: Transaction status
 *           default: "success"
 *           example: "success"
 *         transactionDate:
 *           type: string
 *           format: date-time
 *           description: When the transaction was created
 *           example: "2023-05-20T08:30:00Z"
 *         paidAt:
 *           type: string
 *           format: date-time
 *           description: When the payment was completed
 *           example: "2023-05-20T08:31:23Z"
 *       required:
 *         - user
 *         - booking
 *         - campground
 *         - paymentMethod
 *         - amount
 *
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "507f191e810c19729de860ea"
 *         name:
 *           type: string
 *           example: "John Doe"
 *         email:
 *           type: string
 *           example: "john@example.com"
 *
 *     Booking:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *
 *     Campground:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "607f1f77bcf86cd799439033"
 *         name:
 *           type: string
 *           example: "Beautiful Mountain Camp"
 */

/**
 * @swagger
 * /transaction:
 *   get:
 *     summary: Get all transactions (user's transactions or all if admin)
 *     tags: [Transactions]
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
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /transaction/{id}:
 *   get:
 *     summary: Get a single transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Transaction ID
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
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction not found
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


router.route('/download')
  .get(protect, authorize('admin', 'user'), downloadTransactions);

router.route("/").get(protect, authorize("admin", "user"), getTransactions);
router.route("/:id").get(protect, authorize("admin", "user"), getTransaction);

module.exports = router;