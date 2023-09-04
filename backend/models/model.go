package models

import (
	"context"
	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Service interface {
	HistoryService
	ProblemService
}

type service struct {
	*controllerOps
}

type controllerOps struct {
	*mongo.Client
}

// New returns a Service instance for operating all model service.
func New() (Service, error) {

	client := GetMongoDBClient()

	serv := &service{
		controllerOps: &controllerOps{client},
	}

	return serv, nil //add
}

func GetMongoDBClient() *mongo.Client {
	serverAPI := options.ServerAPI(options.ServerAPIVersion1)
	opts := options.Client().ApplyURI("mongodb+srv://waylon620:123456acxz@cluster0.ks1hfjk.mongodb.net/?retryWrites=true&w=majority").SetServerAPIOptions(serverAPI)
	// Create a new client and connect to the server
	var err error
	client, err := mongo.Connect(context.TODO(), opts)
	if err != nil {
		panic(err)
	}
	// Send a ping to confirm a successful connection
	if err := client.Database("admin").RunCommand(context.TODO(), bson.D{{"ping", 1}}).Err(); err != nil {
		panic(err)
	}
	log.Println("Pinged your deployment. You successfully connected to MongoDB!")
	// insertdb()
	return client
}
