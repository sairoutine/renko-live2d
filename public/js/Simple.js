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

var LOADING_STATE = 1;
var INIT_STATE    = 2;
var DRAWING_STATE = 3;



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
var Simple = function(canvas/*HTML5 canvasオブジェクト*/) {
	var self = this;

	// Live2Dモデルのインスタンス
	self.live2DModel = null;
	// アニメーションを停止するためのID
	self.requestID = null;
	// モデルのロードが完了したら true
	self.loadLive2DModelCompleted = false;
	// モーションのロードが完了したら true
	self.loadLive2DMotionCompleted = false;
	// アプリの状態
	self.state = LOADING_STATE;
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
	// ポーズ
	self.pose = null;
	// canvasオブジェクトを取得
	self.canvas = canvas;
	// WebGL Context
	self.gl = null;

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
	self.gl = Simple.getWebGLContext(self.canvas);

	if (!self.gl) {
		console.error("Failed to create WebGL context.");
		return;
	}

	// 描画エリアを白でクリア
	self.gl.clearColor( 0.0 , 0.0 , 0.0 , 0.0 );

	// PlatformManager を設定
	Live2DFramework.setPlatformManager(new PlatformManager());

	// モーションマネジャーのインスタンス化
	self.motionMgr = new L2DMotionManager();

	//------------ Live2Dの初期化 ------------

	// mocファイルからLive2Dモデルのインスタンスを生成
	Simple.loadBytes(MODEL_DEFINE.model, function(buf){
		self.live2DModel = Live2DModelWebGL.loadModel(buf);
	});

	// ポーズのロード(json内のposeがあるかチェック)
	if(MODEL_DEFINE.pose){
		Simple.loadBytes(MODEL_DEFINE.pose, function(buf){
			// ポースクラスのロード
			self.pose = L2DPose.load(buf);
		});
	}

	// テクスチャの読み込み
	var loadCount = 0;
	var imageLoader = function ( tno ){// 即時関数で i の値を tno に固定する（onerror用)
		self.loadedImages[tno] = new Image();
		self.loadedImages[tno].src = MODEL_DEFINE.textures[tno];
		self.loadedImages[tno].onload = function(){
			if((++loadCount) === MODEL_DEFINE.textures.length) {
				self.loadLive2DModelCompleted = true;//全て読み終わった
			}
		};
		self.loadedImages[tno].onerror = function() {
			console.error("Failed to load image : " + MODEL_DEFINE.textures[tno]);
		};
	};

	for(var i = 0; i < MODEL_DEFINE.textures.length; i++){
		imageLoader(i);
	}

	// モーションのロード
	var loadCount2 = 0;
	var motionLoader = function ( tno ){// 即時関数で i の値を tno に固定する（onerror用)
		Simple.loadBytes(MODEL_DEFINE.motions[tno], function(buf){

			self.motions.push(Live2DMotion.loadMotion(buf));
			if((++loadCount2) === MODEL_DEFINE.motions.length) {
				self.loadLive2DMotionCompleted = true;//全て読み終わった
			}

		});
	};

	for(i = 0; i < MODEL_DEFINE.motions.length; i++){
		motionLoader(i);
	}

	// コンテキストの消失／復元管理
	self.setContextRecover();

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

// コンテキストの消失／復元管理
Simple.prototype.setContextRecover = function() {
	var self = this;
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
};

//------------ 描画ループ ------------
Simple.prototype.tick = function() {
	var self = this;

	self.run(); // 1回分描画

	self.requestID = window.requestAnimationFrame(self.tick.bind(self));// 一定時間後に自身を呼び出す
};

Simple.prototype.stopLoop = function() {
	var self = this;
	self.loadLive2DModelCompleted = false;
	self.loadLive2DMotionCompleted = false;

	window.cancelAnimationFrame(self.requestID); //アニメーションを停止
};

Simple.prototype.changeState = function(state) {
	this.state = state;
};

Simple.prototype.run = function() {
	var self = this;

	// Canvasをクリアする
	self.gl.clear(self.gl.COLOR_BUFFER_BIT);

	switch (self.state) {
		case LOADING_STATE: // Live2D初期化
			if(self.live2DModel && self.loadLive2DModelCompleted && self.loadLive2DMotionCompleted) {
				self.changeState(INIT_STATE);
			}
			break;
		case INIT_STATE: // ロード完了後に初期化する
			// 画像からWebGLテクスチャを生成し、モデルに登録
			for( var i = 0; i < self.loadedImages.length; i++ ){
				//Image型オブジェクトからテクスチャを生成
				var texName = self.createTexture(self.gl, self.loadedImages[i]);
				self.live2DModel.setTexture(i, texName); //モデルにテクスチャをセット
			}

			// テクスチャの元画像の参照をクリア
			self.loadedImages = null;

			// OpenGLのコンテキストをセット
			self.live2DModel.setGL(self.gl);

			// 表示位置を指定するための行列を定義する
			var w = self.live2DModel.getCanvasWidth();
			var h = self.live2DModel.getCanvasHeight();
			var s = 2.0 / h;
			var p = w / h;

			var matrix4x4 = [
			 s, 0, 0, 0,
			 0,-s, 0, 0,
			 0, 0, 1, 0,
			-1, 1, 0, 1 // 左から「x位置, y位置, 0, スケール」
			];
			self.live2DModel.setMatrix(matrix4x4);

			self.changeState(DRAWING_STATE);
			break;
		case DRAWING_STATE: // モーションが終了していたら再生する
			if(self.motionMgr.isFinished() || self.motionchange === true ){
				self.motionMgr.startMotion(self.motions[self.motionnm], 0);
				self.motionchange = false;
			}
			// モーション指定されていない場合は何も再生しない
			if(self.motionnm !== null){
				// モーションパラメータの更新
				self.motionMgr.updateParam(self.live2DModel);
			}

			// ポーズパラメータの更新
			if(self.pose !== null) {
				self.pose.updateParam(self.live2DModel);
			}

			// Live2Dモデルを更新して描画
			self.live2DModel.update(); // 現在のパラメータに合わせて頂点等を計算
			self.live2DModel.draw();	// 描画

			break;
	}
};

/*
* Image型オブジェクトからテクスチャを生成
*/
Simple.prototype.createTexture = function(gl/*WebGLコンテキスト*/, image/*WebGL Image*/) {
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
* WebGLのコンテキストを取得する
*/
Simple.getWebGLContext = function(canvas) {
	var self = this;
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
			console.error( "Failed to load (" + request.status + ") : " + path );
			break;
		}
	};

	request.send(null);
};
