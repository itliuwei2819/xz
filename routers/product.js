//引入模块
const express = require("express");
//引入连接池
const pool = require("../pool.js");

//创建空路由器
let router = express.Router();
//挂载路由
//===============================================
//1.商品列表 GET /list
router.get("/list", (req, res) => {  
  //1.1获取数据
  //1.2如果页码pno为空 默认为1 如果pageSize大小为空默认是2  要保证pageSize大小为整数
  //验证页码
  let pno = parseInt(req.query.pno);
  pno = pno ? pno : 1;
  //验证每页大小
  let pageSize = parseInt(req.query.pageSize);
  pageSize = pageSize ? pageSize : 2;
  //1.3计算开始查询的值start
  let start = (pno - 1) * pageSize;

  //1.4执行SQL语句 注意是2个SQL语句
  let sql = `SELECT count(*) as Count FROM xz_laptop; 
    SELECT a.lid,a.title,a.price,a.sold_count,a.is_onsale,b.md as pic FROM xz_laptop a 
    INNER JOIN (select laptop_id, max(md) md from xz_laptop_pic GROUP BY laptop_id) b 
    ON a.lid = b.laptop_id  LIMIT ?,?`;    
  //执行SQL语句，响应查询到的数据
  pool.query(sql, [start, pageSize], (err, result) => {
    if (err) {
      res.send({ code: 301, msg: `list failed, errMessage: ${err}` }); //throw err;
      return;
    }   
    let recordCount = result[0][0]["Count"]; //获取记录总数，第1个SQL语句的执行结果
    let pageCount = Math.floor(recordCount / pageSize) + 1; //计算总页数    
    //如果数据获取成功（记录数量是0也是一种成功），响应对象
    let retJson={
        code: 200,
        msg: "list ok",
        recordCount:recordCount,
        pageSize:pageSize,
        pageCount:pageCount,
        pno:pno, 
        data:result[1],//第2个SQL语句的执行结果
    };
    res.send(retJson); 
  });
});

//2.商品详情 GET /detail
router.get("/detail", (req, res) => {  
  //1.1获取数据
  let product = req.query;
  //1.2验证各项数据是否为空
  if (!product.lid) {
    res.send({ code: 401, msg: "lid required" });
    return;
  }

  //1.3执行4个SQL语句，把查询的数据响应给浏览器
  let sql = `SELECT * FROM xz_laptop WHERE lid=?;
             SELECT pid,laptop_id,sm,md,lg FROM xz_laptop_pic WHERE laptop_id=?;
             SELECT fid,fname FROM xz_laptop_family INNER JOIN xz_laptop ON xz_laptop_family.fid = xz_laptop.family_id WHERE xz_laptop.lid = ?;
             SELECT lid,spec FROM xz_laptop WHERE family_id IN (SELECT family_id FROM xz_laptop WHERE lid = ?); `;
  pool.query(
    sql,
    [product.lid, product.lid, product.lid, product.lid],
    (err, results) => {
      //出错返回
      if (err) {
        res.send({ code: 301, msg: `list failed, errMessage: ${err}` }); //throw err;
        return;
      }
      //如果数据查询成功，按要求组装成JSON对象
      let objJson = results[0][0]; //第1个SQL语句的返回结果的第1条记录（也只有1条记录）
      if (objJson) {
        objJson["picList"] = results[1]; //第2个SQL语句的返回结果
        let family = results[2][0]; //第3个SQL语句的返回结果的第一条记录（也只有1条记录）
        objJson["family"] = family;
        if (objJson["family"]) objJson["family"]["laptopList"] = results[3]; //第4个SQL语句的返回结果
      }
      res.send({ code: 200, msg: "ok", details: objJson });
    }
  );
});

//===============================================
//3.删除商品 GET /delete   http://127.0.0.1:8080/product/delete?lid=1
router.get("/delete", (req, res) => {
  //1.1获取数据
  let product = req.query;
  //1.2验证数据
  if (!product.lid) {
    res.send({ code: 401, msg: "lid required" });
    return;
  }
  //1.3执行SQL语句
  let sql = "DELETE FROM xz_laptop WHERE lid =?";
  pool.query(sql, [product.lid], (err, result) => {
    if (err) {
      res.send({
        code: 201,
        msg: `delete failed, errMessage: ${err.sqlMessage}`,
      }); //throw err;
      return;
    }
    
    //判断数据库操作影响的记录行数
    if (result.affectedRows > 0) {
      res.send({ code: 200, msg: `delete success ：lid=${product.lid}` });
    } else {
      res.send({ code: 301, msg: `delete failed：lid=${product.lid}` });
    }
  });
});

//===============================================
//4.商品添加 POST /add
router.post("/add", (req, res) => {  
  //1.1获取数据
  let product = req.body;
  //1.2验证各项数据是否为空
  let codeno = 400;
  //遍历对象的属性
  for (const key in product) {
    codeno++;
    if (!product[key]) {
      res.send({ code: codeno, msg: `${key} required` });
      return;
    }
  }
  //1.3执行SQL语句
  let sql = "INSERT INTO xz_laptop SET ?";
  pool.query(sql, [product], (err, result) => {    
    if (err) {
      res.send({ code: 301, msg: `add failed, err: ${err}`}); //throw err;
      return;
    }
    
    //如果数据插入成功，响应对象
    if (result.affectedRows > 0) {
      res.send({ code: 200, msg: `add success：id=${result.insertId}` });
    } else {
      res.send({ code: 301, msg: `add failed , err: ${err.sqlMessage}` });
    }
  });
});
//===============================================
//导出路由器
module.exports = router;

