const pemesananModel = require(`../models/index`).pemesanan;
const detailsOfPemesananModel = require(`../models/index`).detail_pemesanan;
const userModel = require(`../models/index`).user;
const roomModel = require(`../models/index`).kamar;
const tipeKamarModel = require(`../models/index`).tipe_kamar;

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const Op = require(`sequelize`).Op;
const Sequelize = require("sequelize");
const sequelize = new Sequelize("hotel", "root", "", {
  host: "localhost",
  dialect: "mysql",
});

//tambah data
exports.addPemesanan = async (request, response) => {
  let nomor_kamar = request.body.nomor_kamar;
  
  // Mencari kamar berdasarkan nomor kamar
  let room = await roomModel.findOne({
    where: {
      nomor_kamar: {
        [Op.substring]: nomor_kamar
      },
    },
    attributes: ["id", "nomor_kamar", "tipeKamarId", "createdAt", "updatedAt"],
    include: [
      {
        model: tipeKamarModel,
        attributes: ["harga"],
      },
    ],
  });

  let nama_user = request.body.nama_user;

  // Mencari user berdasarkan nama
  let userId = await userModel.findOne({
    where: {
      nama_user: {
        [Op.substring]: nama_user
      },
    },
  });

  // Cek apakah kamar dan user ada
  if (room === null) {
    return response.json({
      success: false,
      message: 'Kamar yang anda inputkan tidak ada',
    });
  } else if (userId === null) {
    return response.json({
      success: false,
      message: 'User yang anda inputkan tidak ada',
    });
  } else {
    // Menyiapkan data pemesanan
    let newData = {
      nomor_pemesanan: request.body.nomor_pemesanan,
      nama_pemesan: request.body.nama_pemesan,
      email_pemesan: request.body.email_pemesan,
      tgl_pemesanan: new Date(), // Menggunakan waktu saat ini
      tgl_check_in: new Date(request.body.check_in),
      tgl_check_out: new Date(request.body.check_out),
      nama_tamu: request.body.nama_tamu,
      jumlah_kamar: request.body.jumlah_kamar, 
      tipeKamarId: room.tipeKamarId,
      status_pemesanan: request.body.status,
      userId: userId.id,
    };

    console.log(newData);

    // Cek ketersediaan kamar
    let roomCheck = await sequelize.query(
      `SELECT * FROM detail_pemesanans 
       WHERE kamarId = ${room.id} 
       AND tgl_akses >= "${request.body.check_in}" 
       AND tgl_akses <= "${request.body.check_out}";`
    );

    // Jika kamar tersedia
    if (roomCheck[0].length === 0) {
      const tglCheckIn = new Date(request.body.check_in);
      const tglCheckOut = new Date(request.body.check_out);
      const diffTime = Math.abs(tglCheckOut - tglCheckIn);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      try {
        const result = await pemesananModel.create(newData);
        let pemesananID = result.id;
        let detailData = [];

        for (let i = 0; i <= diffDays; i++) {
          let newDetail = {
            pemesananId: pemesananID,
            kamarId: room.id,
            tgl_akses: new Date(tglCheckIn.getTime() + i * 24 * 60 * 60 * 1000),
            harga: room.tipe_kamar.harga,
          };
          detailData.push(newDetail);
        }

        await detailsOfPemesananModel.bulkCreate(detailData);
        return response.json({
          success: true,
          message: 'New transaction has been inserted',
        });
      } catch (error) {
        return response.json({
          success: false,
          message: error.message,
        });
      }
    } else {
      return response.json({
        success: false,
        message: 'Kamar yang anda pesan sudah di booking',
      });
    }
  }
};

exports.updatePemesanan = async (request, response) => {
  let nomor_kamar = request.body.nomor_kamar;
  let room = await roomModel.findOne({
    where: {
      [Op.and]: [{ nomor_kamar: { [Op.substring]: nomor_kamar } }],
    },
    attributes: ["id", "nomor_kamar", "tipeKamarId", "createdAt", "updatedAt"],
  });

  let nama_user = request.body.nama_user;
  let userId = await userModel.findOne({
    where: {
      [Op.and]: [{ nama_user: { [Op.substring]: nama_user } }],
    },
  });

  let newData = {
    nomor_pemesanan: request.body.nomor_pemesanan,
    nama_pemesan: request.body.nama_pemesan,
    email_pemesan: request.body.email_pemesan,
    tgl_pemesanan: request.body.tgl_pemesanan,
    tgl_check_in: request.body.check_in,
    tgl_check_out: request.body.check_out,
    nama_tamu: request.body.nama_tamu,
    jumlah_kamar: 1, // Hanya satu jumlah kamar yang diizinkan
    tipeKamarId: room.tipeKamarId,
    status_pemesanan: request.body.status,
    userId: userId.id,
  };

  let pemesananID = request.params.id;

  try {
    const existingPemesanan = await pemesananModel.findByPk(pemesananID);

    if (!existingPemesanan) {
      return response.json({
        success: false,
        message: `Pemesanan dengan ID ${pemesananID} tidak ditemukan`,
      });
    }

    await existingPemesanan.update(newData);

    return response.json({
      success: true,
      message: `Pemesanan dengan ID ${pemesananID} berhasil diperbarui`,
    });
  } catch (error) {
    return response.json({
      success: false,
      message: error.message,
    });
  }
};


//delete data
exports.deletePemesanan = async (request, response) => {
  let pemesananID = request.params.id;

  detailsOfPemesananModel
    .destroy({
      where: { pemesananId: pemesananID },
    })
    .then((result) => {
      pemesananModel
        .destroy({ where: { id: pemesananID } })
        .then((result) => {
          return response.json({
            success: true,
            message: `Transaction has been deleted`,
          });
        })
        .catch((error) => {
          return response.json({
            success: false,
            message: error.message,
          });
        });
    })
    .catch((error) => {
      return response.json({
        success: false,
        message: error.message,
      });
    });
};

//mendapatkan semua data
exports.getAllPemesanan = async (request, response) => {
  const result = await pemesananModel.findAll({
    include: {
      model: tipeKamarModel,
      attributes: ['nama_tipe_kamar']
    }
  });
  if (result.length === 0) {
    return response.json({
      success: true,
      data: [],
      message: "Data tidak ditemukan",
    })
  }

  response.json({
    success: true,
    data: result,
    message: `All Transaction have been loaded...`,
  });
};

//mendapatkan salah satu data
exports.find = async (request, response) => {
  let status = request.body.status;

  const result = await pemesananModel.findAll({
    where: {
      [Op.and]: [{ status_pemesanan: status }],
    },
  });

  return response.json({
    success: true,
    data: result,
    message: `Transaction have been loaded`,
  });
};

exports.updateStatusBooking = async (req, res) => {
  try {
    const params = { id: req.params.id };

    const result = await pemesananModel.findOne({ where: params });
    if (!result) {
      return res.status(404).json({
        message: "Data not found!",
      });
    }

    const data = {
      status_pemesanan: req.body.status_pemesanan,
    };

    if (data.status_pemesanan === "check_out") {
      await pemesananModel.update(data, { where: params });

      const updateTglAccess = {
        tgl_akses: null,
      };
      await detailsOfPemesananModel.update(updateTglAccess, { where: params });
      return res.status(200).json({
        message: "Success update status booking to check out",
        code: 200,
      });
    }

    await pemesananModel.update(data, { where: params });
    return res.status(200).json({
      message: "Success update status booking",
      code: 200,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Internal error",
      err: err,
    });
  }
};

exports.getNota = async (request, response) => {
  try {
    const { nomor_pemesanan } = request.params;

    // Query SQL untuk mengambil data pemesanan berdasarkan nomor_pemesanan
    const result = await sequelize.query(
      `SELECT pemesanans.id, pemesanans.nomor_pemesanan, pemesanans.nama_pemesan, 
              pemesanans.email_pemesan, pemesanans.tgl_pemesanan, pemesanans.tgl_check_in, 
              pemesanans.tgl_check_out, pemesanans.nama_tamu, pemesanans.jumlah_kamar, 
              pemesanans.status_pemesanan, tipe_kamars.nama_tipe_kamar, tipe_kamars.harga, 
              users.nama_user
       FROM pemesanans
       JOIN tipe_kamars ON tipe_kamars.id = pemesanans.tipeKamarId
       JOIN users ON users.id = pemesanans.userId
       WHERE pemesanans.nomor_pemesanan = :nomor_pemesanan`,
      {
        replacements: { nomor_pemesanan },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (result.length === 0) {
      return response.status(404).json({
        success: false,
        message: 'Pemesanan not found',
      });
    }

    const pemesanan = result[0];

    // Buat file PDF
    const doc = new PDFDocument();
    const filename = `Nota_Pemesanan_${pemesanan.nomor_pemesanan}.pdf`;
    const filePath = path.join(__dirname, '../nota', filename);

    // Save file in the server temporarily
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Header
    doc.fontSize(20).text('Nota Pemesanan Hotel', { align: 'center' });
    doc.moveDown();

    // Detail Hotel
    doc.fontSize(14).text('Nama Hotel: Davina Hotel and Resort');
    doc.text(`Tanggal Transaksi: ${pemesanan.tgl_pemesanan}`);
    doc.moveDown();

    // Detail Pemesanan
    doc.fontSize(16).text('Detail Pemesanan', { underline: true });
    doc.fontSize(12);
    doc.text(`Nomor Pemesanan: ${pemesanan.nomor_pemesanan}`);
    doc.text(`Nama Pemesan: ${pemesanan.nama_pemesan}`);
    doc.text(`Email Pemesan: ${pemesanan.email_pemesan}`);
    doc.text(`Tanggal Check-in: ${pemesanan.tgl_check_in}`);
    doc.text(`Tanggal Check-out: ${pemesanan.tgl_check_out}`);
    doc.text(`Jumlah Kamar: ${pemesanan.jumlah_kamar}`);
    doc.text(`Status Pemesanan: ${pemesanan.status_pemesanan}`);
    doc.text(`Tipe Kamar: ${pemesanan.nama_tipe_kamar}`);
    doc.text(`Harga Kamar: ${pemesanan.harga}`);
    doc.text(`Nama Tamu: ${pemesanan.nama_tamu}`);
    doc.moveDown();

    // Detail User
    doc.text(`User: ${pemesanan.nama_user}`);
    doc.moveDown();

    // End PDF document
    doc.end();

    // Wait until PDF is created and send it in response
    writeStream.on('finish', () => {
      response.download(filePath, filename, (err) => {
        if (err) {
          console.error('Error downloading file:', err);
        }

        // Hapus file setelah dikirim ke client
        fs.unlinkSync(filePath);
      });
    });
  } catch (error) {
    return response.status(500).json({
      success: false,
      message: 'Gagal mencetak nota pemesanan: ' + error.message,
    });
  }
};

exports.findPemesananByTgl = async (request, response) => {
  let tgl_pemesanan = request.params.tgl_pemesanan;

  try {
    console.log('Tgl Pemesanan:', tgl_pemesanan);

    const result = await sequelize.query(
      `SELECT pemesanans.id, pemesanans.nomor_pemesanan, pemesanans.nama_pemesan, 
              pemesanans.email_pemesan, pemesanans.tgl_pemesanan, pemesanans.tgl_check_in, 
              pemesanans.tgl_check_out, pemesanans.nama_tamu, pemesanans.jumlah_kamar, 
              tipe_kamars.nama_tipe_kamar, pemesanans.status_pemesanan, users.nama_user 
          FROM pemesanans 
          JOIN tipe_kamars ON tipe_kamars.id = pemesanans.id_tipe_kamar 
          JOIN users ON users.id = pemesanans.id_user 
          WHERE pemesanans.tgl_pemesanan = ? 
          ORDER BY pemesanans.id DESC`,
      {
        replacements: [tgl_pemesanan],
        type: sequelize.QueryTypes.SELECT
      }
    );

    console.log('Result:', result);

    if (result.length === 0) {
      return response.status(400).json({
        success: false,
        message: "No pemesanans found",
      });
    }

    return response.json({
      success: true,
      data: result,
      message: 'Pemesanan found',
    });
  } catch (error) {
    console.error('Error in findPemesanan:', error.message);
    return response.status(500).json({
      success: false,
      message: error.message,
    });
  }
};