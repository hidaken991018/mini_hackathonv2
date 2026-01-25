'use client';

import { useState } from 'react';
import BottomNav from '@/components/BottomNav';
import ScreenHeader from '@/components/ScreenHeader';
import NoteCard from '@/components/NoteCard';
import CreateNoteButtons from '@/components/CreateNoteButtons';
import NoteDetailModal from '@/components/NoteDetailModal';
import RecipeSlideModal from '@/components/RecipeSlideModal';
import ChatMessageList from '@/components/ChatMessageList';
import ChatInput from '@/components/ChatInput';
import NotificationCard from '@/components/NotificationCard';
import { Note, Message, Notification, ReceiptAnalysisResult } from '@/types';

type Tab = 'input' | 'chat' | 'notifications';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('input');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // Input画面の状態
  const [notes, setNotes] = useState<Note[]>([
    {
      id: '1',
      text: '今日の買い物リスト\n- トマト\n- レタス\n- チーズ\n- パン\n- バター',
      images: [],
      updatedAt: new Date(Date.now() - 1800000),
    },
    {
      id: '2',
      text: '冷蔵庫の在庫確認\n\n野菜がたくさんあります。\n- キャベツ\n- にんじん\n- 玉ねぎ\n- じゃがいも',
      images: ['https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&h=400&fit=crop'],
      updatedAt: new Date(Date.now() - 3600000),
    },
    {
      id: '3',
      text: 'レシート\n\nスーパーで買い物しました\n合計: 3,450円',
      images: ['https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=400&fit=crop'],
      updatedAt: new Date(Date.now() - 7200000),
    },
    {
      id: '4',
      text: '冷蔵庫の中身\n\n肉類:\n- 鶏もも肉\n- 豚バラ肉\n- ベーコン',
      images: [
        'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=400&fit=crop',
      ],
      updatedAt: new Date(Date.now() - 10800000),
    },
    {
      id: '5',
      text: '食べたいものリスト\n\n- カレーライス\n- ハンバーグ\n- パスタ\n- サラダ',
      images: [],
      updatedAt: new Date(Date.now() - 14400000),
    },
    {
      id: '6',
      text: 'レシート（コンビニ）\n\n2024/01/15\n- おにぎり: 120円\n- サンドイッチ: 280円\n- コーヒー: 150円',
      images: ['https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=400&fit=crop'],
      updatedAt: new Date(Date.now() - 18000000),
    },
  ]);

  // Chat画面の状態
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'user',
      content: 'こんにちは',
    },
    {
      id: '2',
      role: 'assistant',
      content: 'こんにちは！何かお手伝いできることはありますか？',
    },
    {
      id: '3',
      role: 'user',
      content: '今日の献立を考えてほしいです',
    },
    {
      id: '4',
      role: 'assistant',
      content: '冷蔵庫の写真を見せていただけますか？それに基づいて献立を提案できます。',
    },
    {
      id: '5',
      role: 'user',
      content: '後で写真を送ります',
    },
    {
      id: '6',
      role: 'assistant',
      content: '承知しました。写真を送っていただければ、最適な献立をご提案いたします！',
    },
  ]);
  const [inputText, setInputText] = useState('');

  // Notifications画面の状態
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'トマトとチーズのパスタ',
      body: '冷蔵庫の食材で作れる簡単レシピ',
      image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=400&fit=crop',
      createdAt: new Date(Date.now() - 3600000),
      readAt: null,
      recipe: {
        ingredients: [
          'パスタ 200g',
          'トマト 2個',
          'モッツァレラチーズ 100g',
          'にんにく 1片',
          'オリーブオイル 大さじ2',
          'バジル 適量',
          '塩・胡椒 適量',
        ],
        steps: [
          {
            step: 1,
            instruction: 'パスタを茹でる。パッケージの表示時間通りに茹で、茹で上がったら湯切りをする。',
          },
          {
            step: 2,
            instruction: 'フライパンにオリーブオイルを入れ、みじん切りにしたにんにくを弱火で炒める。',
          },
          {
            step: 3,
            instruction: 'トマトを一口大に切って加え、中火で炒める。トマトから水分が出てきたら、塩・胡椒で味を整える。',
          },
          {
            step: 4,
            instruction: '茹でたパスタを加え、よく絡める。',
          },
          {
            step: 5,
            instruction: '器に盛り、モッツァレラチーズとバジルをトッピングして完成。',
          },
        ],
        cookingTime: '約20分',
        servings: '2人分',
      },
    },
    {
      id: '2',
      title: '野菜たっぷりサラダ',
      body: '冷蔵庫の野菜で作れるヘルシーサラダ',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop',
      createdAt: new Date(Date.now() - 7200000),
      readAt: new Date(Date.now() - 3600000),
      recipe: {
        ingredients: [
          'レタス 1/2個',
          'トマト 1個',
          'きゅうり 1本',
          'にんじん 1/2本',
          'オリーブオイル 大さじ1',
          'レモン汁 大さじ1',
          '塩・胡椒 適量',
        ],
        steps: [
          {
            step: 1,
            instruction: 'レタスは一口大にちぎり、水で洗って水気を切る。',
          },
          {
            step: 2,
            instruction: 'トマト、きゅうり、にんじんを食べやすい大きさに切る。',
          },
          {
            step: 3,
            instruction: 'ボウルに野菜を入れ、オリーブオイル、レモン汁、塩・胡椒で和える。',
          },
          {
            step: 4,
            instruction: '器に盛り付けて完成。',
          },
        ],
        cookingTime: '約10分',
        servings: '2人分',
      },
    },
    {
      id: '3',
      title: 'チキンカレー',
      body: '冷蔵庫の鶏肉で作る本格カレー',
      image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=400&fit=crop',
      createdAt: new Date(Date.now() - 10800000),
      readAt: null,
      recipe: {
        ingredients: [
          '鶏もも肉 300g',
          '玉ねぎ 1個',
          'にんじん 1本',
          'じゃがいも 2個',
          'カレールー 1箱',
          '水 600ml',
          'サラダ油 大さじ1',
        ],
        steps: [
          {
            step: 1,
            instruction: '鶏肉は一口大に切り、玉ねぎは薄切り、にんじんとじゃがいもは乱切りにする。',
          },
          {
            step: 2,
            instruction: 'フライパンに油を熱し、鶏肉を炒める。表面に焼き色がついたら取り出す。',
          },
          {
            step: 3,
            instruction: '同じフライパンで玉ねぎを炒め、透き通るまで炒める。',
          },
          {
            step: 4,
            instruction: 'にんじん、じゃがいもを加えて炒め、水を加えて煮る。',
          },
          {
            step: 5,
            instruction: '沸騰したら弱火にして20分煮る。',
          },
          {
            step: 6,
            instruction: '一度火を止めてカレールーを加え、溶けたら再び弱火で10分煮込む。',
          },
        ],
        cookingTime: '約40分',
        servings: '4人分',
      },
    },
    {
      id: '4',
      title: '買い物リマインダー',
      body: '牛乳が少なくなっています。買い物リストに追加しますか？',
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
      createdAt: new Date(Date.now() - 14400000),
      readAt: null,
    },
    {
      id: '5',
      title: '食材の賞味期限',
      body: '卵の賞味期限が近づいています',
      image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop',
      createdAt: new Date(Date.now() - 18000000),
      readAt: null,
    },
    {
      id: '6',
      title: 'ハンバーグ',
      body: '冷蔵庫のひき肉で作る手作りハンバーグ',
      image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=400&fit=crop',
      createdAt: new Date(Date.now() - 21600000),
      readAt: null,
      recipe: {
        ingredients: [
          '合い挽き肉 300g',
          '玉ねぎ 1/2個',
          'パン粉 大さじ2',
          '牛乳 大さじ2',
          '卵 1個',
          '塩・胡椒 適量',
          'サラダ油 適量',
        ],
        steps: [
          {
            step: 1,
            instruction: '玉ねぎをみじん切りにして、フライパンで炒めて冷ます。',
          },
          {
            step: 2,
            instruction: 'ボウルに合い挽き肉、パン粉、牛乳、卵、炒めた玉ねぎ、塩・胡椒を入れてよく混ぜる。',
          },
          {
            step: 3,
            instruction: '4等分にして丸く成形する。',
          },
          {
            step: 4,
            instruction: 'フライパンに油を熱し、ハンバーグを両面焼く。',
          },
          {
            step: 5,
            instruction: '中火で5分ずつ、両面を焼いて完成。',
          },
        ],
        cookingTime: '約30分',
        servings: '2人分',
      },
    },
    {
      id: '7',
      title: 'オムライス',
      body: 'シンプルで美味しいオムライス',
      image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=400&fit=crop',
      createdAt: new Date(Date.now() - 25200000),
      readAt: null,
      recipe: {
        ingredients: [
          'ご飯 2膳',
          '卵 3個',
          '鶏もも肉 100g',
          '玉ねぎ 1/4個',
          'ケチャップ 大さじ3',
          'バター 大さじ1',
          '塩・胡椒 適量',
        ],
        steps: [
          {
            step: 1,
            instruction: '鶏肉と玉ねぎをみじん切りにする。',
          },
          {
            step: 2,
            instruction: 'フライパンにバターを溶かし、鶏肉と玉ねぎを炒める。',
          },
          {
            step: 3,
            instruction: 'ご飯を加えて炒め、ケチャップで味付けする。',
          },
          {
            step: 4,
            instruction: '別のフライパンで卵を炒り卵にする。',
          },
          {
            step: 5,
            instruction: '炒めたご飯を器に盛り、その上に炒り卵をのせて完成。',
          },
        ],
        cookingTime: '約15分',
        servings: '2人分',
      },
    },
    {
      id: '8',
      title: '食材チェック',
      body: '冷蔵庫に新しい食材が追加されました',
      image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&h=400&fit=crop',
      createdAt: new Date(Date.now() - 28800000),
      readAt: null,
    },
  ]);

  // ノート追加処理（画像付き）
  const handleAddNoteWithImage = (imageUrl: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      text: '',
      images: [imageUrl],
      updatedAt: new Date(),
    };
    setNotes([newNote, ...notes]);
  };

  // テキストノート作成処理
  const handleCreateTextNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      text: '',
      images: [],
      updatedAt: new Date(),
    };
    setNotes([newNote, ...notes]);
    // 新規作成したノートをすぐに開く
    setSelectedNote(newNote);
  };

  // レシート解析結果処理
  const handleReceiptAnalysis = (result: ReceiptAnalysisResult, imageUrl: string) => {
    // 食材リストをテキスト形式に整形
    const ingredientsList = result.ingredients.length > 0
      ? result.ingredients.map(item => `- ${item}`).join('\n')
      : '食材が読み取れませんでした';

    // ノートのテキストを作成
    let noteText = 'レシート読み取り結果\n\n';

    noteText += '\n【購入した食材】\n' + ingredientsList;

    // 新しいノートを作成
    const newNote: Note = {
      id: Date.now().toString(),
      text: noteText,
      images: [imageUrl],
      updatedAt: new Date(),
    };

    // ノートリストの先頭に追加
    setNotes([newNote, ...notes]);

    // 作成したノートを開く
    setSelectedNote(newNote);
  };

  // ノート更新処理
  const handleUpdateNote = (id: string, text: string) => {
    const updatedNotes = notes.map((note) =>
      note.id === id ? { ...note, text, updatedAt: new Date() } : note
    );
    setNotes(updatedNotes);
    // 選択中のノートも更新
    if (selectedNote && selectedNote.id === id) {
      setSelectedNote({ ...selectedNote, text, updatedAt: new Date() });
    }
  };

  // メッセージ送信処理
  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
    };
    setMessages([...messages, userMessage]);
    setInputText('');

    // 0.6秒後にダミーAI返信
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'ありがとうございます。その情報を参考に、最適な提案をさせていただきます。',
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 600);
  };

  // 通知既読処理
  const handleMarkAsRead = (id: string) => {
    setNotifications(
      notifications.map((notif) =>
        notif.id === id ? { ...notif, readAt: new Date() } : notif
      )
    );
  };

  // 全て既読処理
  const handleMarkAllAsRead = () => {
    setNotifications(
      notifications.map((notif) =>
        notif.readAt === null ? { ...notif, readAt: new Date() } : notif
      )
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {activeTab === 'input' && (
        <>
          <ScreenHeader title="Input" />
          <div className="flex-1 overflow-y-auto pb-20 bg-gray-50">
            <div className="bg-white divide-y divide-gray-100">
              {notes.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-gray-400 text-sm">ノートがありません</p>
                  <p className="text-gray-300 text-xs mt-1">右下のボタンからノートを作成してください</p>
                </div>
              ) : (
                notes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onUpdate={(text) => handleUpdateNote(note.id, text)}
                    onClick={() => setSelectedNote(note)}
                  />
                ))
              )}
            </div>
          </div>
          <CreateNoteButtons
            onImageSelect={handleAddNoteWithImage}
            onTextNoteCreate={handleCreateTextNote}
            onReceiptAnalysis={handleReceiptAnalysis}
          />
        </>
      )}

      {/* ノート詳細モーダル */}
      <NoteDetailModal
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
        onUpdate={handleUpdateNote}
      />

      {activeTab === 'chat' && (
        <>
          <ScreenHeader title="AI Chat" />
          <ChatMessageList messages={messages} />
          <ChatInput
            value={inputText}
            onChange={setInputText}
            onSend={handleSendMessage}
          />
        </>
      )}

      {activeTab === 'notifications' && (
        <>
          <ScreenHeader
            title="Notifications"
            rightAction={
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                全て既読
              </button>
            }
          />
          <div className="flex-1 overflow-y-auto pb-20 bg-gray-50">
            <div className="px-4 py-4">
              <div className="grid grid-cols-3 gap-3">
                {notifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={() => handleMarkAsRead(notification.id)}
                    onClick={() => setSelectedNotification(notification)}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ノート詳細モーダル */}
      <NoteDetailModal
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
        onUpdate={handleUpdateNote}
      />

      {/* レシピスライドモーダル */}
      <RecipeSlideModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onMarkAsRead={handleMarkAsRead}
      />
    </div>
  );
}
