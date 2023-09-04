package models

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

type Problem struct {
	Id          string `json:"id" bson:"id"`
	Description string `json:"description" bson:"description"`
	Answer      string `json:"answer" bson:"answer"`
	Is_correct  bool   `json:"is_correct" bson:"is_correct"`
}

type ProblemService interface {
	Save_problem(p Problem) (Problem, error)
	Search_problem(id string) (Problem, error)
}

func (t *controllerOps) Save_problem(p Problem) (Problem, error) {
	c := t.Client.Database("Project").Collection("problem_set")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	new := bson.M{
		"id":          p.Id,
		"description": p.Description,
		"answer":      p.Answer,
		"is_correct":  p.Is_correct,
	}
	if i, err := c.InsertOne(ctx, new); err != nil {
		return Problem{}, err
	} else {
		log.Println(i)
		return p, nil
	}
}

func (t *controllerOps) Search_problem(id string) (Problem, error) {
	fmt.Print(id)
	c := t.Client.Database("Project").Collection("problem_set")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	filter := bson.M{
		"id": id,
	}
	var p = &Problem{}
	err := c.FindOne(ctx, filter).Decode(p)
	if err != nil {
		return Problem{}, err
	} else {
		log.Print(*p)
		return *p, nil
	}
}
