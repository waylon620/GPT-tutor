package models

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

type History struct {
	UserID    string `json:"user_id" bson:"user_id"`
	Type      string `json:"type" bson:"type"`
	Chats     []Chat `json:"chats" bson:"chats"`
	Problem   string `json:"problem" bson:"problem"`
	BingReply string `json:"bing_reply" bson:"bing_reply"`
}

type Chat struct {
	Role    string `json:"role" bson:"role"`
	Content string `json:"content" bson:"content"`
	Time    string `json:"time" bson:"time"`
}

type HistoryService interface {
	Search_chat(id string) (bool, []Chat)
	Create_chat(his History) error
	Insert_chat(id string, chats []Chat) error
	Update_problem(id string, problem string) error
	Update_bing_reply(id string, reply string) error
	Search_Problem(id string) (bool, string)
	Search_bing_reply(id string) (bool, string)
	// Delete_db(id string) error

}

func (t *controllerOps) Search_chat(id string) (bool, []Chat) {
	c := t.Client.Database("Project").Collection("History")
	log.Println(id)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	selector := bson.M{
		"user_id": id,
	}
	u := &History{}
	if err := c.FindOne(ctx, selector).Decode(u); err != nil {
		return false, nil
	}
	// log.Println(u)
	return true, u.Chats
}

func (t *controllerOps) Create_chat(his History) error {
	c := t.Client.Database("Project").Collection("History")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	new := bson.M{
		"user_id":    his.UserID,
		"type":       his.Type,
		"chats":      his.Chats,
		"problem":    his.Problem,
		"bing_reply": his.BingReply,
	}
	if i, err := c.InsertOne(ctx, new); err != nil {
		return err
	} else {
		log.Println(i)
		return nil
	}
	// return nil
}
func (t *controllerOps) Update_problem(id string, problem string) error {
	c := t.Client.Database("Project").Collection("History")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	selector := bson.M{
		"user_id": id,
	}
	u := &History{}
	if err := c.FindOne(ctx, selector).Decode(u); err != nil {
		return err
	} else {
		u.Problem = problem
		_, err = c.UpdateOne(ctx, selector, bson.M{"$set": u})
		if err != nil {
			return err
		}
		log.Print(u.Problem)
	}
	return nil
}

func (t *controllerOps) Update_bing_reply(id string, reply string) error {
	c := t.Client.Database("Project").Collection("History")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	selector := bson.M{
		"user_id": id,
	}
	u := &History{}
	if err := c.FindOne(ctx, selector).Decode(u); err != nil {
		return err
	} else {
		u.BingReply = reply
		_, err = c.UpdateOne(ctx, selector, bson.M{"$set": u})
		if err != nil {
			return err
		}
		log.Print(u.BingReply)
	}
	return nil
}

func (t *controllerOps) Search_Problem(id string) (bool, string) {
	c := t.Client.Database("Project").Collection("History")
	log.Println(id)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	selector := bson.M{
		"user_id": id,
	}
	u := &History{}
	if err := c.FindOne(ctx, selector).Decode(u); err != nil {
		return false, ""
	}
	// log.Println(u)
	return true, u.Problem
}

func (t *controllerOps) Search_bing_reply(id string) (bool, string) {
	c := t.Client.Database("Project").Collection("History")
	log.Println(id)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	selector := bson.M{
		"user_id": id,
	}
	u := &History{}
	if err := c.FindOne(ctx, selector).Decode(u); err != nil {
		return false, ""
	}
	// log.Println(u)
	return true, u.BingReply
}

func (t *controllerOps) Insert_chat(id string, chats []Chat) error {
	c := t.Client.Database("Project").Collection("History")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	selector := bson.M{
		"user_id": id,
	}
	u := &History{}
	if err := c.FindOne(ctx, selector).Decode(u); err != nil {
		return err
	} else {
		u.Chats = chats
		_, err = c.UpdateOne(ctx, selector, bson.M{"$set": u})
		if err != nil {
			return err
		}
		log.Print(u.Chats)
	}
	return nil
}
