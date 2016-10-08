/* global Live2D, Live2DModelWebGL, Live2DMotion, L2DMotionManager, L2DPose, Live2DFramework, PlatformManager */
'use strict';

// Live2Dモデル定義
var MODEL_PATH = "assets/model/";
var IMAGE_PATH = "assets/model/";
var MODEL_DEFINE = {
	"type":"Live2D Model Setting",
	"name":"renko",
	"model": MODEL_PATH + "model.moc",
	"textures":[
		IMAGE_PATH + "model.2048/texture_00.png",
	],
	"motions":[
		MODEL_PATH + "motions/idle_01.mtn",
		MODEL_PATH + "motions/haru_idle_01.mtn",
		MODEL_PATH + "motions/haru_m_01.mtn",
		MODEL_PATH + "motions/haru_normal_01.mtn",
	],
	//"pose": MODEL_PATH + "haru.pose.json",
};

// 画面ロード時
window.onload = function(){
	var canvas = document.getElementById("glcanvas");

	// Live2Dの初期化
	Live2D.init();

	var glCanvas = new Simple(canvas);

	// Init and start Loop
	glCanvas.startLoop();
};

/*
 * メイン処理
 */
var Simple = function(canvas) {
	var self = this;

	// Live2Dモデルのインスタンス
	self.live2DModel = null;
	// アニメーションを停止するためのID
	self.requestID = null;
	// モデルのロードが完了したら true
	self.loadLive2DCompleted = false;
	// モーションのロードが完了したら true
	self.loadLive2DCompleted2 = false;
	// モデルの初期化が完了したら true
	self.initLive2DCompleted = false;
	// WebGL Image型オブジェクトの配列
	self.loadedImages = [];
	// モーション
	self.motions = [];
	// モーション管理マネジャー
	self.motionMgr = null;
	// モーション番号
	self.motionnm = 0;
	// モーションチェンジ
	self.motionchange = false;
	// Live2D モデル設定
	self.modelDef = MODEL_DEFINE;
	// ポーズ
	self.pose = null;
	// canvasオブジェクトを取得
	self.canvas = canvas;
};

/*
* WebGLコンテキストを取得・初期化。
* Live2Dの初期化、描画ループを開始。
*/
Simple.prototype.startLoop = function() {
	// コールバック対策
	var self = this;

	//------------ WebGLの初期化 ------------

	// WebGLのコンテキストを取得する
	var para = {
		premultipliedAlpha : true,
	//        alpha : false
	};
	var gl = this.getWebGLContext(self.canvas, para);
	if (!gl) {
		console.error("Failed to create WebGL context.");
		return;
	}

	// 描画エリアを白でクリア
	gl.clearColor( 0.0 , 0.0 , 0.0 , 0.0 );

	self.gl = gl;

	var motionbuf, arrayBuf;

	// PlatformManager を設定
	Live2DFramework.setPlatformManager(new PlatformManager());

	//------------ Live2Dの初期化 ------------
	// mocファイルからLive2Dモデルのインスタンスを生成
	Simple.loadBytes(self.modelDef.model, function(buf){
		// ArrayBufferに変換
		//var arrayBuf = this.toArrayBuffer(mocbuf);

		self.live2DModel = Live2DModelWebGL.loadModel(buf);
	});

	// テクスチャの読み込み
	var loadCount = 0;
	var imageLoader = function ( tno ){// 即時関数で i の値を tno に固定する（onerror用)
		self.loadedImages[tno] = new Image();
		self.loadedImages[tno].src = self.modelDef.textures[tno];
		self.loadedImages[tno].onload = function(){
			if((++loadCount) === self.modelDef.textures.length) {
				self.loadLive2DCompleted = true;//全て読み終わった
			}
		};
		self.loadedImages[tno].onerror = function() {
			console.error("Failed to load image : " + self.modelDef.textures[tno]);
		};
	};


	for(var i = 0; i < self.modelDef.textures.length; i++){
		imageLoader(i);
	}

	// モーションのロード
	var loadCount2 = 0;
	var motionLoader = function ( tno ){// 即時関数で i の値を tno に固定する（onerror用)
		Simple.loadBytes(self.modelDef.motions[tno], function(buf){
			// ArrayBufferに変換
			//var arrayBuf = this.toArrayBuffer(mocbuf);

			self.motions.push(Live2DMotion.loadMotion(buf));
			if((++loadCount2) === self.modelDef.motions.length) {
				self.loadLive2DCompleted2 = true;//全て読み終わった
			}

		});
	};

	for(i = 0; i < self.modelDef.motions.length; i++){
		motionLoader(i);
	}

	// モーションマネジャーのインスタンス化
	self.motionMgr = new L2DMotionManager();

	// ポーズのロード(json内のposeがあるかチェック)
	if(self.modelDef.pose){
		Simple.loadBytes(self.modelDef.pose, function(buf){
			// ポースクラスのロード
			self.pose = L2DPose.load(buf);
		});
	}


	// コンテキストを失ったとき
	self.canvas.addEventListener("webglcontextlost", function(e) {
		console.error("context lost");
		self.stopLoop();
		e.preventDefault();
	}, false);

	// コンテキストが復元されたとき
	self.canvas.addEventListener("webglcontextrestored" , function(e){
		console.error("webglcontext restored");
		self.startLoop();
	}, false);

	// マウスクリックイベント
	self.canvas.addEventListener("click", function(e){
		self.motionchange = true;
		if(self.motions.length - 1  > self.motionnm){
			self.motionnm++;
		}else{
			self.motionnm = 0;
		}
	}, false);

	//------------ 描画ループ ------------
	self.tick();
};

//------------ 描画ループ ------------
Simple.prototype.tick = function() {
	var self = this;

	self.draw(self.gl, self); // 1回分描画

	self.requestID = window.requestAnimationFrame(self.tick.bind(self));// 一定時間後に自身を呼び出す
};

Simple.prototype.stopLoop = function() {
	var self = this;
	self.loadLive2DCompleted = false;
	self.loadLive2DCompleted2 = false;
	self.initLive2DCompleted = false;

	window.cancelAnimationFrame(self.requestID); //アニメーションを停止
};




Simple.prototype.draw = function(gl/*WebGLコンテキスト*/, that)
{
	// Canvasをクリアする
	gl.clear(gl.COLOR_BUFFER_BIT);

	// Live2D初期化
	if( ! that.live2DModel || ! that.loadLive2DCompleted || ! that.loadLive2DCompleted2)
		return; //ロードが完了していないので何もしないで返る

	// ロード完了後に初回のみ初期化する
	if( ! that.initLive2DCompleted ){
		that.initLive2DCompleted = true;

		// 画像からWebGLテクスチャを生成し、モデルに登録
		for( var i = 0; i < that.loadedImages.length; i++ ){
			//Image型オブジェクトからテクスチャを生成
			var texName = that.createTexture(gl, that.loadedImages[i]);
			that.live2DModel.setTexture(i, texName); //モデルにテクスチャをセット
		}

		// テクスチャの元画像の参照をクリア
		that.loadedImages = null;
		// OpenGLのコンテキストをセット
		that.live2DModel.setGL(gl);

		// 表示位置を指定するための行列を定義する
		var w = that.live2DModel.getCanvasWidth();
		var h = that.live2DModel.getCanvasHeight();
		var s = 2.0 / h;
		var p = w / h;

		var matrix4x4 = [
		 s, 0, 0, 0,
		 0,-s, 0, 0,
		 0, 0, 1, 0,
		-1, 1, 0, 1 // 左から「x位置, y位置, 0, スケール」
		];
		that.live2DModel.setMatrix(matrix4x4);
	}


	// モーションが終了していたら再生する
	if(that.motionMgr.isFinished() || that.motionchange === true ){
		that.motionMgr.startMotion(that.motions[that.motionnm], 0);
		that.motionchange = false;
		console.info("motion:" + that.motionnm);
	}
	// モーション指定されていない場合は何も再生しない
	if(that.motionnm !== null){
		// モーションパラメータの更新
		that.motionMgr.updateParam(that.live2DModel);
	}

	// ポーズパラメータの更新
	if(that.pose !== null) {
		that.pose.updateParam(that.live2DModel);
	}


	// // キャラクターのパラメータを適当に更新
	//    var t = UtSystem.getTimeMSec() * 0.001 * 2 * Math.PI; //1秒ごとに2π(1周期)増える
	//    var cycle = 3.0; //パラメータが一周する時間(秒)
	//    // PARAM_ANGLE_Xのパラメータが[cycle]秒ごとに-30から30まで変化する
	//    live2DModel.setParamFloat("PARAM_ANGLE_X", 30 * Math.sin(t/cycle));

	// Live2Dモデルを更新して描画
	that.live2DModel.update(); // 現在のパラメータに合わせて頂点等を計算
	that.live2DModel.draw();	// 描画
};


/*
* WebGLのコンテキストを取得する
*/
Simple.prototype.getWebGLContext = function(canvas/*HTML5 canvasオブジェクト*/)
{
	var NAMES = [ "webgl" , "experimental-webgl" , "webkit-3d" , "moz-webgl"];

	var param = {
		alpha : true,
		premultipliedAlpha : true
	};

	for( var i = 0; i < NAMES.length; i++ ){
		try{
			var ctx = canvas.getContext( NAMES[i], param );
			if( ctx ) return ctx;
		}
		catch(e){}
	}
	return null;
};


/*
* Image型オブジェクトからテクスチャを生成
*/
Simple.prototype.createTexture = function(gl/*WebGLコンテキスト*/, image/*WebGL Image*/)
{
	var texture = gl.createTexture(); //テクスチャオブジェクトを作成する
	if ( !texture ){
		console.error("Failed to generate gl texture name.");
		return -1;
	}

	gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);	//imageを上下反転
	gl.activeTexture( gl.TEXTURE0 );
	gl.bindTexture( gl.TEXTURE_2D , texture );
	gl.texImage2D( gl.TEXTURE_2D , 0 , gl.RGBA , gl.RGBA , gl.UNSIGNED_BYTE , image);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);


	gl.generateMipmap(gl.TEXTURE_2D);
	gl.bindTexture( gl.TEXTURE_2D , null );

	return texture;
};


/*
* ファイルをバイト配列としてロードする
*/
Simple.loadBytes = function(path , callback) {
	var request = new XMLHttpRequest();
	request.open("GET", path , true);
	request.responseType = "arraybuffer";
	request.onload = function(){
		switch( request.status ){
		case 200:
			callback( request.response );
			break;
		default:
			Simple.myerror( "Failed to load (" + request.status + ") : " + path );
			break;
		}
	};

	request.send(null);
};

Simple.prototype.toArrayBuffer = function(buffer)
{
	var ab = new ArrayBuffer(buffer.length);
	var view = new Uint8Array(ab);
	for(var i = 0; i < buffer.length; ++i){
		view[i] = buffer[i];
	}
	return ab;
};
